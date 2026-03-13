---
name: add-sockets
description: >-
  Adds Socket.IO WebSocket support to the NestJS project. Installs packages,
  creates a WS JWT authentication guard, a gateway, and a socket service that
  other modules can inject to emit events. Use when the user asks to add
  sockets, WebSockets, real-time, or Socket.IO to the project.
---

# Add Sockets

Full turnkey setup for Socket.IO WebSockets with JWT authentication. Follow every step in order.

## Step 1: Install packages

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io
```

## Step 2: Create the sockets module

### `src/sockets/sockets.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from '@/config/jwt.config';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './providers/socket.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [ConfigModule.forFeature(jwtConfig), JwtModule.registerAsync(jwtConfig.asProvider())],
  providers: [SocketGateway, SocketService, WsJwtGuard],
  exports: [SocketService],
})
export class SocketsModule {}
```

### `src/sockets/guards/ws-jwt.guard.ts`

This guard verifies the JWT token sent during the Socket.IO handshake. Clients must pass the token as `auth.token` in the connection options.

```typescript
import { JwtConfig } from '@/config/jwt.config';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '@/config/jwt.config';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization?.split(' ')[1];

    if (!token) {
      client.disconnect();
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
      });
      client.data.user = payload;
      return true;
    } catch {
      client.disconnect();
      return false;
    }
  }
}
```

### `src/sockets/socket.gateway.ts`

The gateway handles connections, disconnections, and a sample `ping` event. It authenticates every connection using `WsJwtGuard`.

```typescript
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { SocketService } from './providers/socket.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly socketService: SocketService) {}

  afterInit() {
    this.socketService.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    const token =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization?.split(' ')[1];

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.socketService.verifyToken(token);
      client.data.user = payload;
      client.join(`user:${payload.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // client disconnected
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    return { event: 'pong', data };
  }
}
```

### `src/sockets/providers/socket.service.ts`

A shared service that other modules can inject to emit events to specific users or broadcast to all.

```typescript
import { JwtConfig } from '@/config/jwt.config';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '@/config/jwt.config';
import { Server } from 'socket.io';

@Injectable()
export class SocketService {
  private server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  async verifyToken(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.jwtConfiguration.secret,
      audience: this.jwtConfiguration.audience,
      issuer: this.jwtConfiguration.issuer,
    });
  }

  emitToUser(userId: number, event: string, payload: any) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToAll(event: string, payload: any) {
    this.server?.emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: any) {
    this.server?.to(room).emit(event, payload);
  }
}
```

## Step 3: Wire into `src/app.module.ts`

1. Add import at the top:

```typescript
import { SocketsModule } from './sockets/sockets.module';
```

2. Add `SocketsModule` to the `imports` array.

## Step 4: Client usage

Inform the user how to connect from the client side:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:PORT', {
  auth: { token: 'your-jwt-access-token' },
});

socket.on('connect', () => console.log('connected'));
socket.on('pong', (data) => console.log('pong', data));
socket.emit('ping', { hello: 'world' });
```

## Step 5: Using SocketService from other modules

Any module that needs to emit events should import `SocketsModule` and inject `SocketService`:

```typescript
// In another module's .module.ts:
import { SocketsModule } from '@/sockets/sockets.module';

@Module({
  imports: [SocketsModule],
  // ...
})

// In a provider:
constructor(private readonly socketService: SocketService) {}

// Emit to a specific user:
this.socketService.emitToUser(userId, 'notification', { message: 'Hello' });
```

## Verification

After completing all steps, run:

```bash
npm run build
```

Confirm zero errors before finishing.
