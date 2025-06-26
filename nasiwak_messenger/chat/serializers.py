from rest_framework import serializers
from .models import Message , Group,GroupMessage , MessageReaction
from authentication.models import CustomUser

class MessageReactionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = MessageReaction
        fields = ['id', 'emote', 'user', 'user_name', 'timestamp']

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)

    reply_to = serializers.SerializerMethodField()

    def get_reply_to(self, obj):
        if obj.reply_to:
            return {
                "id": obj.reply_to.id,
                "content": obj.reply_to.content,
                "sender_name": obj.reply_to.sender.name,
                "file_url": obj.reply_to.file.url if obj.reply_to.file else None,
                "file_name": obj.reply_to.file_name,
            }
        return None
    
    class Meta:
        model = Message
        fields = '__all__' 
        extra_fields = ['sender_name', 'reactions'] 

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['sender_name'] = instance.sender.name  
        return data

class GroupSerializer(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(many=True, queryset=CustomUser.objects.all())

    class Meta:
        model = Group
        fields = ["id", "name", "members", "created_at"]

class GroupMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.name", read_only=True)

    class Meta:
        model = GroupMessage
        fields = ["id", "group", "sender", "sender_name", "content", "file", "file_name", "timestamp"]
