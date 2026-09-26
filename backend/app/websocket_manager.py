from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[
            int,
            list[tuple[int, WebSocket]]
        ] = {}

    def connect(
        self,
        connection_id: int,
        user_id: int,
        websocket: WebSocket,
    ):
        if connection_id not in self.active_connections:
            self.active_connections[connection_id] = []

        self.active_connections[connection_id].append(
            (user_id, websocket)
        )

    def disconnect(
        self,
        connection_id: int,
        user_id: int,
        websocket: WebSocket,
    ):
        sockets = self.active_connections.get(connection_id)

        if sockets is None:
            return

        self.active_connections[connection_id] = [
            item
            for item in sockets
            if item != (user_id, websocket)
        ]

        if not self.active_connections[connection_id]:
            del self.active_connections[connection_id]

    def is_user_connected(
        self,
        connection_id: int,
        user_id: int,
    ) -> bool:
        sockets = self.active_connections.get(
            connection_id,
            [],
        )

        return any(
            active_user_id == user_id
            for active_user_id, _ in sockets
        )

    async def broadcast(
        self,
        connection_id: int,
        data: dict,
    ):
        sockets = self.active_connections.get(
            connection_id,
            [],
        )

        disconnected = []

        for user_id, websocket in sockets:
            try:
                await websocket.send_json(data)
            except Exception:
                disconnected.append(
                    (user_id, websocket)
                )

        for user_id, websocket in disconnected:
            self.disconnect(
                connection_id,
                user_id,
                websocket,
            )


manager = ConnectionManager()