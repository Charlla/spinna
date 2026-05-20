/*
 * Spinna rooms — Supabase helpers used by the API routes.
 *
 * All DB access goes through the service-role client; tables are
 * RLS-locked to service role only (same pattern as spitwars_rooms).
 */

import { createServiceClient } from '@/lib/supabase'
import { ringForIdx, makeRoomCode, makeWorldSeed, type RoomRing } from './prng'

export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface Room {
  id: string
  code: string
  host_id: string
  host_name: string
  status: RoomStatus
  world_seed: number
  current_ring: RoomRing | null
  ring_idx: number
  arena_size: number
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

export interface RoomMember {
  id: string
  room_id: string
  player_id: string
  display_name: string
  seat: number
  ready: boolean
  car_id: string
  tire_id: string
  rings_banked: number
  tires_popped_at: string | null
  joined_at: string
}

/** Find an open room by code, returning null if missing. */
export async function findRoomByCode(code: string): Promise<Room | null> {
  const db = createServiceClient()
  const { data } = await db
    .from('spinna_rooms')
    .select('*')
    .eq('code', code)
    .maybeSingle()
  return data as Room | null
}

/** List up to N open rooms (status='waiting'), newest first. */
export async function listOpenRooms(limit = 20) {
  const db = createServiceClient()
  const { data } = await db
    .from('spinna_rooms')
    .select('id, code, host_name, status, created_at')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

/** Fetch a room's full member list ordered by seat ASC. */
export async function listRoomMembers(roomId: string): Promise<RoomMember[]> {
  const db = createServiceClient()
  const { data } = await db
    .from('spinna_room_members')
    .select('*')
    .eq('room_id', roomId)
    .order('seat', { ascending: true })
  return (data ?? []) as RoomMember[]
}

/** Insert a room owned by `host`. Retries on code collisions. */
export async function createRoom(host: {
  id: string
  display_name: string
}): Promise<Room> {
  const db = createServiceClient()
  const worldSeed = makeWorldSeed()
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode()
    const { data, error } = await db
      .from('spinna_rooms')
      .insert({
        code,
        host_id: host.id,
        host_name: host.display_name,
        status: 'waiting',
        world_seed: worldSeed,
        ring_idx: 0,
      })
      .select('*')
      .single()
    if (data) {
      // Host occupies seat 0 immediately.
      await db.from('spinna_room_members').insert({
        room_id: data.id,
        player_id: host.id,
        display_name: host.display_name,
        seat: 0,
        ready: false,
      })
      await logEvent(data.id, host.id, 'member_joined', { seat: 0 })
      return data as Room
    }
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(error.message)
    }
  }
  throw new Error('Could not pick a unique room code')
}

/** Add a member. Picks the next free seat (1..7). Returns the row + room. */
export async function joinRoom(
  room: Room,
  player: { id: string; display_name: string }
): Promise<RoomMember> {
  if (room.status !== 'waiting') throw new Error('Room is not accepting joiners')
  const db = createServiceClient()
  const members = await listRoomMembers(room.id)
  const existing = members.find(m => m.player_id === player.id)
  if (existing) return existing
  if (members.length >= 8) throw new Error('Room is full (8 players)')
  const taken = new Set(members.map(m => m.seat))
  let seat = -1
  for (let i = 1; i < 8; i++) {
    if (!taken.has(i)) { seat = i; break }
  }
  if (seat < 0) throw new Error('No free seat')
  const { data, error } = await db
    .from('spinna_room_members')
    .insert({
      room_id: room.id,
      player_id: player.id,
      display_name: player.display_name,
      seat,
      ready: false,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to join')
  await logEvent(room.id, player.id, 'member_joined', { seat })
  return data as RoomMember
}

/** Remove a member. If they were the host and the room is still waiting,
 *  the room is closed (status=finished, ended_at=now). */
export async function leaveRoom(room: Room, playerId: string): Promise<void> {
  const db = createServiceClient()
  await db
    .from('spinna_room_members')
    .delete()
    .eq('room_id', room.id)
    .eq('player_id', playerId)
  await logEvent(room.id, playerId, 'member_left', {})
  if (playerId === room.host_id && room.status === 'waiting') {
    await db
      .from('spinna_rooms')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', room.id)
  }
}

/** Toggle (or set explicitly) the ready flag for a member. */
export async function setReady(roomId: string, playerId: string, ready: boolean) {
  const db = createServiceClient()
  await db
    .from('spinna_room_members')
    .update({ ready })
    .eq('room_id', roomId)
    .eq('player_id', playerId)
}

/** Host-only: flip status to playing + spawn the first ring. */
export async function startRoom(room: Room): Promise<Room> {
  if (room.status !== 'waiting') throw new Error('Room already started')
  const db = createServiceClient()
  const firstRing = ringForIdx(room.world_seed, 0)
  const { data, error } = await db
    .from('spinna_rooms')
    .update({
      status: 'playing',
      started_at: new Date().toISOString(),
      current_ring: firstRing,
      ring_idx: 0,
    })
    .eq('id', room.id)
    .eq('status', 'waiting') // guard against race
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to start room')
  await logEvent(room.id, null, 'round_start', { world_seed: room.world_seed })
  return data as Room
}

/** Server-authoritative ring bank.
 *  Returns { ok:true, room } if the caller banked; { ok:false, code } otherwise. */
export async function bankRing(
  roomId: string,
  playerId: string,
  ringIdx: number
): Promise<{ ok: true; room: Room } | { ok: false; code: 'stale_ring' | 'wrong_state' | 'not_a_member' }> {
  const db = createServiceClient()
  const { data: room } = await db
    .from('spinna_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  if (!room) return { ok: false, code: 'wrong_state' }
  if (room.status !== 'playing') return { ok: false, code: 'wrong_state' }
  if (room.ring_idx !== ringIdx) return { ok: false, code: 'stale_ring' }

  // Atomic step: only one writer wins because ring_idx is part of the WHERE.
  const nextIdx = ringIdx + 1
  const nextRing = ringForIdx(room.world_seed, nextIdx)
  const { data: updated, error } = await db
    .from('spinna_rooms')
    .update({
      ring_idx: nextIdx,
      current_ring: nextRing,
    })
    .eq('id', roomId)
    .eq('ring_idx', ringIdx) // only one client wins this
    .select('*')
    .single()
  if (error || !updated) return { ok: false, code: 'stale_ring' }

  // Bump member rings_banked.
  const { data: member } = await db
    .from('spinna_room_members')
    .select('id, rings_banked')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .maybeSingle()
  if (!member) return { ok: false, code: 'not_a_member' }
  await db
    .from('spinna_room_members')
    .update({ rings_banked: member.rings_banked + 1 })
    .eq('id', member.id)

  await logEvent(roomId, playerId, 'ring_banked', {
    ring_idx: ringIdx,
    server_t: Date.now(),
  })

  return { ok: true, room: updated as Room }
}

/** Mark a member's tires popped. If every member is popped, flip room to finished. */
export async function tiresPopped(roomId: string, playerId: string): Promise<Room | null> {
  const db = createServiceClient()
  const now = new Date().toISOString()
  await db
    .from('spinna_room_members')
    .update({ tires_popped_at: now })
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .is('tires_popped_at', null)
  await logEvent(roomId, playerId, 'tires_popped', {})

  const members = await listRoomMembers(roomId)
  const allPopped = members.length > 0 && members.every(m => m.tires_popped_at != null)
  if (!allPopped) return null
  const { data } = await db
    .from('spinna_rooms')
    .update({ status: 'finished', ended_at: now })
    .eq('id', roomId)
    .eq('status', 'playing')
    .select('*')
    .single()
  if (data) await logEvent(roomId, null, 'round_end', {})
  return (data as Room) ?? null
}

async function logEvent(
  roomId: string,
  playerId: string | null,
  eventType: string,
  payload: Record<string, unknown>
) {
  const db = createServiceClient()
  await db.from('spinna_room_events').insert({
    room_id: roomId,
    player_id: playerId,
    event_type: eventType,
    payload,
  })
}
