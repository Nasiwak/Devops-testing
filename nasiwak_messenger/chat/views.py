
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Message,Call , Group , GroupMessage , MessageReaction
from .serializers import MessageSerializer , GroupMessageSerializer , GroupSerializer
from authentication.models import CustomUser  # Import your user model
from django.conf import settings

from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
from rest_framework.decorators import api_view, permission_classes
import os
from django.db.models import Q

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_group(request):
    """ API to create a new group """
    group_name = request.data.get("name")
    members = request.data.get("members")  # List of user IDs

    if not group_name or not members:
        return Response({"error": "Group name and members are required"}, status=400)

    group = Group.objects.create(name=group_name)
    group.members.set(members)
    
    return Response(GroupSerializer(group).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_members_to_group(request, group_id):
    """ API to add members to a group """
    try:
        group = Group.objects.get(id=group_id)
        new_member = request.data.get("userId")  # List of user IDs
        group.members.add(new_member)
        return Response({"message": "Members added successfully"})
    except Group.DoesNotExist:
        return Response({"error": "Group not found"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_group_message(request, group_id):
    """ API to send a message to a group with file-sharing support """
    sender = request.user
    content = request.data.get("content", "")
    files = request.FILES.getlist("files", None)  # ✅ Get multiple files
    file_names = request.data.getlist("file_names")  # ✅ Get file names

    try:
        group = Group.objects.get(id=group_id)
        if sender not in group.members.all():
            return Response({"error": "You are not a member of this group"}, status=403)

        if not content and not files:
            return Response({"error": "Either content or file must be provided"}, status=400)

        # ✅ Create a message object without file first

        file_urls = []
        
        if files:
            messages = []
            for file, name in zip(files, file_names):
                message = GroupMessage.objects.create(group=group, sender=sender) 
                message.content = content if len(files) - len(messages) == 1 else ""
                message.file = file
                message.file_name = name
                message.save()
                file_urls.append(message.file.url)  # ✅ Collect file URLs
                messages.append(message)
            
            serializer = GroupMessageSerializer(messages,many=True)
            
        else:
            message = GroupMessage.objects.create(group=group, sender=sender, content=content)
            serializer = GroupMessageSerializer(message)

        # ✅ Serialize and return response
        return Response({
            "message": serializer.data,
            "files": [{"name": f.name, "url": url} for f, url in zip(files, file_urls)]
        }, status=201)

    except Group.DoesNotExist:
        return Response({"error": "Group not found"}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_group_messages(request, group_id):
    """ API to get all messages in a group """
    print("Fetching Group msg ")
    try:
        group = Group.objects.get(id=group_id)
        if request.user not in group.members.all():
            return Response({"error": "You are not a member of this group"}, status=403)

        messages = group.messages.all()
        return Response(GroupMessageSerializer(messages, many=True).data)
    except Group.DoesNotExist:
        return Response({"error": "Group not found"}, status=404)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_groups(request):
    """ Fetch all groups where the logged-in user is a member """
    user = request.user
    groups = Group.objects.filter(members=user)
    
    serializer = GroupSerializer(groups, many=True)
    return Response(serializer.data)
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """ API to send a message (supports multiple files) """
    print("Incoming request data:", request.data)  # ✅ Debugging log

    sender = request.user
    receiver_id = request.data.get("receiver")
    content = request.data.get("content", "")
    reply_to_id = request.data.get("reply_to")  
    

    if not receiver_id:
        return Response({"error": "Receiver is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    if not content and not request.FILES:
        return Response({"error": "Either content or file must be provided"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        receiver = CustomUser.objects.get(id=receiver_id)
    except CustomUser.DoesNotExist:
        return Response({"error": "Receiver not found"}, status=status.HTTP_404_NOT_FOUND)

    # Create the message object (without file yet)
    # message = Message.objects.create(sender=sender, receiver=receiver, content=content ,)
    reply_to = Message.objects.filter(id=reply_to_id).first() if reply_to_id else None
    # Handle multiple file uploads
    files = request.FILES.getlist("files",None)  # ✅ Get list of files
    if files:
        file_names = request.data.getlist("file_names")  # ✅ Get list of file names
        # print(file_names)
        file_urls = []
        messages=[]
        for file,name in zip(files,file_names):
            # print(name)
            # Create a new message for each file or add the file to the message
            message = Message.objects.create(sender=sender, receiver=receiver,reply_to=reply_to)
            message.content = content if len(files) - len(messages) == 1 else ""
            message.file = file
            message.file_name = name
            message.save()
            file_urls.append(message.file.url) # Collect file URLs
            messages.append(message)
        print(messages)
        serializer = MessageSerializer(messages, many=True)
            
        
        # print([{"name": f.name, "url": url} for f, url in zip(files, file_urls)])
        # Serialize the message with files
        
        return Response({
            "message": serializer.data,
            "files": [{"name": f.name, "url": url} for f, url in zip(files, file_urls)]
        }, status=status.HTTP_201_CREATED)
    
    else:
        # receiver = CustomUser.objects.get(id=receiver_id)
        message = Message.objects.create(sender=sender, receiver=receiver, content=content, reply_to=reply_to)
        serializer = MessageSerializer(message)
        print("Message saved:", serializer.data)  # ✅ Debugging log
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        


@api_view(['GET'])
@permission_classes([IsAuthenticated])  # ✅ Require login
def get_messages(request, sender_id, receiver_id):
    """ API to fetch messages between two users (only for logged-in users) """
    if request.user.id not in [sender_id, receiver_id]:  # ✅ Restrict access
        return Response({'error': 'You can only view your own messages'}, status=status.HTTP_403_FORBIDDEN)
    user_id = request.user.id
    
    messages = Message.objects.filter(sender_id=sender_id, receiver_id=receiver_id) | \
               Message.objects.filter(sender_id=receiver_id, receiver_id=sender_id)
    # messages = Message.objects.filter(
    #     (
    #         Q(sender_id=sender_id, receiver_id=receiver_id) &
    #         Q(is_deleted_by_sender=False if user_id == sender_id else True)
    #     ) |
    #     (
    #         Q(sender_id=receiver_id, receiver_id=sender_id) &
    #         Q(is_deleted_by_receiver=False if user_id == receiver_id else True)
    #     )
    # )
    messages = messages.order_by('timestamp')
    
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])  # ✅ Require login
def get_notification_messages(request, user_id):
    """ API to fetch message Notification (only for logged-in users) """
    if request.user.id != user_id:  # ✅ Restrict access
        return Response({'error': 'You can only view your own messages'}, status=status.HTTP_403_FORBIDDEN)
    
    messages = Message.objects.filter(receiver_id=user_id , is_read = False) 
    messages = messages.order_by('timestamp')
    # print(messages)
    # sender_name = CustomUser.objects.filter(id=messages.sender)
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data,)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users(request):
    """
    API to fetch all users or search users by name.
    If a query parameter is provided, return filtered results.
    """
    query = request.GET.get("query", "")  # Get search query from frontend

    if query:  # If query exists, filter users
        users = CustomUser.objects.filter(name__icontains=query).values("id", "name")
    else:
        users = CustomUser.objects.values("id", "name")  # Return all users if no search query
    
    return Response(users)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_by_email(request, email):
    """ API to fetch a single user by email """
    try:
        user = CustomUser.objects.get(email=email)
        return Response({"email": user.email, "name": user.name, "id": user.id , "phone_number": user.phone_number})
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connected_users(request):
    """ Fetch users the logged-in user has chatted with (sent or received messages). """
    user = request.user

    # Fetch users who sent messages to the logged-in user OR received messages from them
    sent_messages = Message.objects.filter(sender=user).values_list("receiver", flat=True)
    received_messages = Message.objects.filter(receiver=user).values_list("sender", flat=True)
    
    chat_user_ids = set(sent_messages) | set(received_messages)  # Union of both sets

    # Get the actual user objects
    chat_users = CustomUser.objects.filter(id__in=chat_user_ids).values("id", "name")

    return Response(chat_users)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def log_call(request):
    """Log a completed or missed call"""
    caller = request.user
    receiver_id = request.data.get("receiver")
    call_type = request.data.get("call_type")
    status = request.data.get("status", "completed")

    if not receiver_id or not call_type:
        return Response({"error": "Receiver and call type required"}, status=400)

    try:
        receiver = CustomUser.objects.get(id=receiver_id)
        call = Call.objects.create(caller=caller, receiver=receiver, call_type=call_type, status=status)
        return Response({"message": "Call logged", "call_id": call.id}, status=201)
    except CustomUser.DoesNotExist:
        return Response({"error": "Receiver not found"}, status=404)
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_twilio_token(request):
    """Generate Twilio Video Call Token"""
    print("🔍 Incoming request to generate Twilio token")

    # ✅ Use request.user.email or request.user.id instead of username
    print(request,request.user,sep="\n\n")
    identity = request.user.email if request.user.email else f"user_{request.user.id}"
    print("🔹 Assigned User Identity:", identity ,request.data)

    twilio_account_sid = settings.TWILIO_ACCOUNT_SID
    twilio_api_key_sid = settings.TWILIO_API_KEY_SID
    twilio_api_key_secret = settings.TWILIO_API_KEY_SECRET

    if not twilio_account_sid or not twilio_api_key_sid or not twilio_api_key_secret:
        print("❌ Twilio credentials missing in settings")
        return Response({"error": "Twilio credentials not found"}, status=500)

    try:
        token = AccessToken(
            twilio_account_sid, 
            twilio_api_key_sid, 
            twilio_api_key_secret, 
            identity=identity, 
            ttl=3600  # ✅ Set expiration time to 1 hour
        )

        # ✅ Attach Video Grant with a dynamic room name
        video_grant = VideoGrant(room=request.data['room'])
        token.add_grant(video_grant)

        print("✅ Twilio Token Generated Successfully:", token.to_jwt())
        return Response({"token": token.to_jwt()})
    
    except Exception as e:
        print("❌ Error generating Twilio Token:", str(e))
        return Response({"error": str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_message(request, message_id):
    """
    API to update a message (mark as read or change content).
    """
    print(message_id,request.user.id)
    # Get the fields that need to be updated
    is_read = request.data.get('is_read', None)
    content = request.data.get('content', None)
    
    try:
        if is_read != None:
            message = Message.objects.get(id=message_id, receiver=request.user.id)  # Ensure the user owns the message
        elif content!=None: 
            message = Message.objects.get(id=message_id, sender=request.user.id)  # Ensure the user owns the message
        print(message)
    except Message.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)


    # Update fields if provided
    if is_read is not None:
        message.is_read = is_read
    if content is not None:
        message.content = content

    message.save()  # Save the changes

    return Response({'success': 'Message updated successfully'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_reaction(request):
    message_id = request.data.get('message_id')
    user_id = request.data.get('user_id')
    emote = request.data.get('emote')

    if not all([message_id, user_id, emote]):
        return Response({"error": "Missing fields."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        message = Message.objects.get(id=message_id)
        user = CustomUser.objects.get(id=user_id)
    except (Message.DoesNotExist, CustomUser.DoesNotExist):
        return Response({"error": "Message or user not found."}, status=status.HTTP_404_NOT_FOUND)

    # Toggle: Remove if already exists, else add
    existing_reaction = MessageReaction.objects.filter(
        message=message,
        user=user,
        emote=emote
    ).first()

    if existing_reaction:
        existing_reaction.delete()
        return Response({"detail": f"'{emote}' reaction removed."}, status=status.HTTP_200_OK)
    else:
        MessageReaction.objects.create(
            message=message,
            user=user,
            emote=emote
        )
        return Response({"detail": f"'{emote}' reaction added."}, status=status.HTTP_201_CREATED)
    
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def soft_delete_message(request, message_id):
    user = request.user
    try:
        message = Message.objects.get(id=message_id)

        if user == message.sender:
            message.is_deleted_by_sender = True
        elif user == message.receiver:
            message.is_deleted_by_receiver = True
        else:
            return Response({"error": "Unauthorized"}, status=403)

        message.save()
        return Response({"success": True})
    except Message.DoesNotExist:
        return Response({"error": "Message not found"}, status=404)