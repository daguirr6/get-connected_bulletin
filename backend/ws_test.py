import asyncio
import getpass
import json

import websockets


async def listen(websocket):
    try:
        while True:
            message = await websocket.recv()
            print(f"\nReceived: {message}")
    except websockets.ConnectionClosed:
        print("\nConnection closed.")


async def main():
    connection_id = input("Connection ID: ").strip()

    token = getpass.getpass(
        "Access token (hidden): "
    ).strip()

    uri = (
        f"ws://127.0.0.1:8000/"
        f"chats/{connection_id}/ws"
    )

    async with websockets.connect(uri) as websocket:
        await websocket.send(
            json.dumps(
                {
                    "type": "auth",
                    "token": token,
                }
            )
        )

        response = await websocket.recv()
        print(f"Server: {response}")

        listener = asyncio.create_task(
            listen(websocket)
        )

        try:
            while True:
                content = await asyncio.to_thread(
                    input,
                    "\nMessage (/quit to leave): ",
                )

                content = content.strip()

                if content == "/quit":
                    break

                if not content:
                    continue

                await websocket.send(
                    json.dumps(
                        {
                            "type": "message",
                            "content": content,
                        }
                    )
                )

        finally:
            listener.cancel()


if __name__ == "__main__":
    asyncio.run(main())
    