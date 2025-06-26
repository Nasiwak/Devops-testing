import ssl
from django.core.management.commands.runserver import Command as RunserverCommand

class Command(RunserverCommand):
    def run(self, **options):
        cert_file = "django-cert.pem"
        key_file = "django-key.pem"

        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(certfile=cert_file, keyfile=key_file)

        self.stdout.write(self.style.SUCCESS(f"Starting HTTPS server at https://192.168.43.198:8000"))
        super().run(**options, ssl_context=ssl_context)