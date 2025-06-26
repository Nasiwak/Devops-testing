from rest_framework.response import Response
from rest_framework.decorators import api_view,permission_classes
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
# from django.contrib.auth import authenticate
from .models import CustomUser
from .serializers import UserSerializer
# from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated




def get_tokens_for_user(user):
    """ Generate access and refresh tokens for a user """
    user = CustomUser.objects.get(email=user.email)  # Ensure it's an instance of CustomUser
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

#  For User Admin 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users(request):
    """ Get a list of all users (Admin only) """
    if not request.user.is_admin:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
    
    users = CustomUser.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user(request):
    """ Create a new user (Admin only) """
    if not request.user.is_admin:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.refresh_from_db()  

        # Fetch the user again from the DB to avoid any FK issues
        user = CustomUser.objects.get(email=user.email)

        # Generate JWT tokens
        token = get_tokens_for_user(user)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# Signup API
@api_view(['POST'])
@permission_classes([AllowAny])  # Allow anyone to sign up
def signup(request):
    email = request.data.get('email')
    phone_number = request.data.get('phone_number')

    # Check if email already exists
    if CustomUser.objects.filter(email=email).exists():
        return Response({'error': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if phone number already exists (if provided)
    if phone_number and CustomUser.objects.filter(phone_number=phone_number).exists():
        return Response({'error': 'A user with this phone number already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate & create user
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        user.refresh_from_db()  # Ensure user is fully saved in DB before generating tokens

        # Fetch the user again from the DB to avoid any FK issues
        user = CustomUser.objects.get(email=user.email)

        # Generate JWT tokens
        token = get_tokens_for_user(user)

        return Response({'user': serializer.data, 'token': token}, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user(request, user_id):
    """ Update user details (Admin only) """
    if not request.user.is_admin:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    # Check if password is provided in the request data
    if 'password' in request.data and request.data['password']:
        # Hash the new password
        user.set_password(request.data['password'])
        del request.data['password']  # Remove the plaintext password to prevent it from being stored

    # Use the serializer to update user data (serializer handles other fields)
    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        # Save the updated user data
        serializer.save()

        # Optionally, you can fetch the updated user from the DB to return the correct user data
        user.refresh_from_db()

        # Generate JWT tokens if necessary
        token = get_tokens_for_user(user)  # Assuming you are using JWT for authentication

        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id):
    """ Delete a user (Admin only) """
    if not request.user.is_admin:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    user.delete()
    return Response({"message": "User deleted successfully"}, status=status.HTTP_204_NO_CONTENT)


# Login API
@api_view(['POST'])
@permission_classes([AllowAny])  # Allow anyone to log in
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    # Fetch user manually since `authenticate()` expects username
    # User = get_user_model()
    try:
        user = CustomUser.objects.get(email=email)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Check password manually
    if not user.check_password(password):
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    # Generate JWT tokens
    tokens = get_tokens_for_user(user)
    # return Response({'token': tokens, 'user': UserSerializer(user).data}, status=status.HTTP_200_OK)
    return Response({
        'token': {
            'access': tokens['access'],
            'refresh': tokens['refresh']
        },
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)