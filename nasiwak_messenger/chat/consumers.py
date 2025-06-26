# chat/consumers.py

from channels.generic.websocket import AsyncWebsocketConsumer
import json

class ChatConsumer(AsyncWebsocketConsumer):
    # async def connect(self):
    #     self.room_name = self.scope['url_route']['kwargs']['room_name']
    #     self.room_group_name = f"chat_{self.room_name}"

    #     await self.channel_layer.group_add(self.room_group_name, self.channel_name)
    #     await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get("type")
        
        

        # Recognize all relevant message types
        if message_type == "incoming_call":
            receiver_id = str(data["receiver"])
            receiver_group_name = f"user_{receiver_id}"

            # ✅ Send call notification to the receiver's WebSocket group
            await self.channel_layer.group_send(
                receiver_group_name,
                {
                    "type": "incoming_call",
                    "caller": data["caller"],
                    "receiver": receiver_id
                    
                }
            )
            
        elif message_type == "call_invite":
            print(data)
            receiver_id = data["receiver"]
            receiver_group_name = f"user_{receiver_id}"

            # ✅ Send call notification to the receiver's WebSocket group
            await self.channel_layer.group_send(
                receiver_group_name,
                {
                    "type": "call_invite",
                    "caller": data["caller"],
                    "receiver": receiver_id,
                    "room" : data["room"]
                }
            )
            
        elif  message_type == "new_message":
            receiver_id = str(data["receiver"])
            receiver_group_name = f"user_{receiver_id}"

            # ✅ Send call notification to the receiver's WebSocket group
            await self.channel_layer.group_send(
                receiver_group_name,
                {
                    "type": "new_message",
                    "sender": data["sender"],
                    "receiver": receiver_id,
                    "sender_name" : data["sender_name"],
                    "text" : data["text"]
                }
            )
        elif message_type in [
            "chat_message",
            "call_request",
            "call_received",
            "offer",
            "answer",
            "candidate",
            "file_message",
            "call_ended",
            
        ]:
            await self.channel_layer.group_send(self.room_group_name, data)

    async def chat_message(self, event):
        # print("Messagaes from : ",event)
        await self.send(text_data=json.dumps(event))
        
    async def file_message(self, event):
        await self.send(text_data=json.dumps(event))

    async def call_request(self, event):
        await self.send(text_data=json.dumps(event))

    async def call_received(self, event):
        await self.send(text_data=json.dumps(event))

    async def offer(self, event):
        await self.send(text_data=json.dumps(event))

    async def answer(self, event):
        await self.send(text_data=json.dumps(event))

    async def candidate(self, event):
        await self.send(text_data=json.dumps(event))

    async def call_ended(self, event):
        # Let the other side know the call ended
        await self.send(text_data=json.dumps(event))

    async def incoming_call(self, event):
        print(f"📞 Incoming call event triggered for receiver {event['receiver']} from caller {event['caller']}")
        await self.send(text_data=json.dumps(event))
    
    async def new_message(self, event):
        print(f" Incoming msg event triggered for receiver {event['receiver']} from caller {event['sender']}")
        await self.send(text_data=json.dumps(event))
    
    async def call_invite(self, event):
        print(f" Call invite for {event['receiver']} from caller {event['caller']}")
        await self.send(text_data=json.dumps(event))

    
    async def connect(self):
        try:
            if "room_name" in self.scope['url_route']['kwargs']:
                self.room_name = self.scope['url_route']['kwargs']['room_name']
                self.room_group_name = f"chat_{self.room_name}"
            elif "user_id" in self.scope['url_route']['kwargs']:
                self.user_id = str(self.scope['url_route']['kwargs']['user_id'])
                self.room_group_name = f"user_{self.user_id}"
            else:
                print("❌ WebSocket connection failed: No valid parameters")
                await self.close()
                return

            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            print(f"✅ WebSocket connected to {self.room_group_name}")

        except Exception as e:
            print(f"❌ WebSocket connection error: {e}")
            await self.close()

