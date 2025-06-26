from django.db import models

# Create your models here.
from authentication.models import CustomUser  # Import your user model

class Message(models.Model):
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="sent_messages")
    receiver = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="received_messages")
    content = models.TextField()
    file_name = models.CharField(max_length=255,blank=True,null=True)
    file = models.FileField(upload_to="chat_files/", blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    reply_to = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replies")
    
    is_deleted_by_sender = models.BooleanField(default=False)
    is_deleted_by_receiver = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.sender.name} -> {self.receiver.name}: {self.content[:30] or 'File Sent'}"
    
class MessageReaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    emote = models.CharField(max_length=50) 
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user', 'emote') 

    def __str__(self):
        return f"{self.user.name} reacted with {self.emote} to '{self.message.content[:20]}'"


class Call(models.Model):
    caller = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="outgoing_calls")
    receiver = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="incoming_calls")
    timestamp = models.DateTimeField(auto_now_add=True)
    call_type = models.CharField(max_length=10, choices=[("audio", "Audio"), ("video", "Video")])
    status = models.CharField(max_length=10, choices=[("missed", "Missed"), ("completed", "Completed")])

    def __str__(self):
        return f"{self.caller.name} called {self.receiver.name} ({self.call_type})"
    
class Group(models.Model):
    name = models.CharField(max_length=255)
    members = models.ManyToManyField(CustomUser, related_name="group_members")
    created_at = models.DateTimeField(auto_now_add=True)



class GroupMessage(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    content = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to="group_messages/", blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]