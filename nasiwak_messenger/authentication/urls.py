from django.urls import path
from .views import signup, login , get_users, create_user, update_user, delete_user 

urlpatterns = [
    path('signup/', signup, name='signup'),
    path('login/', login, name='login'),
    path('users/', get_users, name='get_users'),
    path('users/create/', create_user, name='create_user'),
    path('users/update/<int:user_id>/', update_user, name='update_user'),
    path('users/delete/<int:user_id>/', delete_user, name='delete_user'),
]
