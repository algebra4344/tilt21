import { GameRoom, type GameRoomOptions } from './GameRoom.js';
import { db } from '../db/index.js';
import { gameRooms } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { releaseRoom } from '../poker/roomLimits.js';

class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  createRoom(dbRoom: GameRoomOptions): GameRoom {
    const room = new GameRoom(dbRoom);
    this.rooms.set(room.id, room);
    return room;
  }

  createRoomInMemory(opts: GameRoomOptions): GameRoom {
    const room = new GameRoom(opts);
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  async joinRoom(
    roomId: string,
    userId: string,
    username: string,
  ): Promise<{ room: GameRoom | null; success: boolean }> {
    let room = this.rooms.get(roomId);
    if (!room) {
      const result = await db
        .select()
        .from(gameRooms)
        .where(eq(gameRooms.id, roomId))
        .limit(1);

      const dbRoom = result[0];
      if (!dbRoom) {
        return { room: null, success: false };
      }

      room = new GameRoom(dbRoom);
      this.rooms.set(room.id, room);
    }

    const success = room.autoJoin(userId, username);
    return { room, success };
  }

  leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const left = room.leave(userId);
    if (left && room.playerCount === 0) {
      this.rooms.delete(roomId);
      releaseRoom(roomId);
    }
    return left;
  }

  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  cleanup(): void {
    for (const [id, room] of this.rooms) {
      if (room.playerCount === 0) {
        this.rooms.delete(id);
        releaseRoom(id);
      }
    }
  }
}

export const roomManager = new RoomManager();
