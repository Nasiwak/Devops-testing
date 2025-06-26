from django.contrib import admin

# Register your models here.
from django.contrib.auth.admin import UserAdmin
from authentication.models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ("id", "email", "name", "phone_number", "is_admin","is_staff", "is_active")  # ✅ Customize fields
    search_fields = ("email", "name", "phone_number")
    list_filter = ("is_staff", "is_superuser", "is_active")

    fieldsets = (
        (None, {"fields": ("email", "name", "phone_number", "password","is_admin")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "is_active", "groups", "user_permissions")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "name", "phone_number", "password1", "password2","is_admin","is_staff", "is_active"),
        }),
    )

    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions")

admin.site.register(CustomUser, CustomUserAdmin)  # ✅ Register the CustomUser model
