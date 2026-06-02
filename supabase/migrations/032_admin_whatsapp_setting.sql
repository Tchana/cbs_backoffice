-- WhatsApp number for students to request course-fee payments (mobile app home screen).

insert into public.app_settings (key, value)
values (
  'admin_whatsapp_number',
  jsonb_build_object('number', '')
)
on conflict (key) do nothing;

comment on table public.app_settings is
  'Global settings. admin_whatsapp_number.value.number = international digits for payment WhatsApp.';
