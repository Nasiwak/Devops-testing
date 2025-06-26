from django.urls import path
# from .views import send_message, get_messages

# urlpatterns = [
#     path('send/', send_message, name='send_message'),
#     path('<int:sender_id>/<int:receiver_id>/', get_messages, name='get_messages'),
# ]

from .views import get_user_by_email, get_users, send_message, get_messages, get_connected_users,generate_twilio_token , create_group , add_members_to_group , send_group_message , get_group_messages , get_user_groups,get_notification_messages,update_message,toggle_reaction,soft_delete_message

urlpatterns = [
    path('auth/user/<str:email>/', get_user_by_email, name='get_user'),  #  for the heading 
    path("auth/get-users/", get_users, name="get_users"),  #  for search bar
    path("api/messages/send/", send_message, name="send_message"),
    path("api/messages/<int:sender_id>/<int:receiver_id>/", get_messages, name="get_messages"),
    path('auth/get-connected-users/', get_connected_users, name='get_connected_users'), # to get users in side bar
    path("generate-token/", generate_twilio_token, name="generate-twilio-token"),
    path("api/group/create/", create_group, name="create_group"),
    path("api/group/<int:group_id>/add-members/", add_members_to_group, name="add_members_to_group"),
    path("api/group/<int:group_id>/send-message/", send_group_message, name="send_group_message"),
    path("api/group/<int:group_id>/messages/", get_group_messages, name="get_group_messages"),
    path("api/groups/", get_user_groups, name="get_user_groups"),
    path("api/notification/<int:user_id>/",get_notification_messages,name="get_notification_messages"),
    path("api/messages/<int:message_id>/update/",update_message,name="update_message"),
    path('messages/react/', toggle_reaction, name='toggle-reaction'),
    path("api/messages/<int:message_id>/soft-delete/", soft_delete_message, name="soft_delete_message"),
] 