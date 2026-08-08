-- Global defaults are intentionally separate from every store's operational data.
-- Editing these templates changes the shared form definition; it never overwrites
-- submitted owner answers or past task evidence.

create table if not exists public.erp_admin_templates (
  template_key text primary key,
  title text not null,
  description text not null default '',
  definition jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint erp_admin_templates_key_check check (template_key in ('store_profile', 'owner_report', 'information_guide')),
  constraint erp_admin_templates_definition_object_check check (jsonb_typeof(definition) = 'object')
);

create table if not exists public.erp_store_work_updates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.erp_stores(id) on delete cascade,
  setup_item_id uuid references public.erp_store_setup_items(id) on delete set null,
  task_date date,
  task_week smallint check (task_week between 1 and 52),
  title text not null,
  owner text not null default 'company' check (owner in ('company', 'owner', 'store_staff')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'blocked')),
  public_visible boolean not null default true,
  evidence_text text,
  evidence_urls jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_store_work_updates_urls_array_check check (jsonb_typeof(evidence_urls) = 'array')
);

create index if not exists erp_store_work_updates_public_idx
  on public.erp_store_work_updates (store_id, public_visible, task_date, created_at);

create table if not exists public.erp_store_goal_settings (
  store_id uuid primary key references public.erp_stores(id) on delete cascade,
  target_months integer not null default 6 check (target_months between 1 and 24),
  target_net_sales numeric(16,2),
  target_new_customers integer,
  target_returning_customers integer,
  target_return_rate numeric(7,4),
  target_average_ticket numeric(16,2),
  table_count integer,
  cpc_cost_override numeric(16,2),
  updated_at timestamptz not null default now()
);

-- Values are encrypted in application code before storage. Only a masked status
-- is ever returned to the browser after save.
create table if not exists public.erp_searchad_store_credentials (
  store_id uuid primary key references public.erp_stores(id) on delete cascade,
  access_license text not null,
  secret_ciphertext text not null,
  secret_last4 text not null,
  updated_at timestamptz not null default now()
);

alter table public.erp_admin_templates enable row level security;
alter table public.erp_store_work_updates enable row level security;
alter table public.erp_store_goal_settings enable row level security;
alter table public.erp_searchad_store_credentials enable row level security;

revoke all on public.erp_admin_templates from anon, authenticated;
revoke all on public.erp_store_work_updates from anon, authenticated;
revoke all on public.erp_store_goal_settings from anon, authenticated;
revoke all on public.erp_searchad_store_credentials from anon, authenticated;

grant select, insert, update, delete on public.erp_admin_templates to service_role;
grant select, insert, update, delete on public.erp_store_work_updates to service_role;
grant select, insert, update, delete on public.erp_store_goal_settings to service_role;
grant select, insert, update, delete on public.erp_searchad_store_credentials to service_role;

drop trigger if exists erp_admin_templates_set_updated_at on public.erp_admin_templates;
create trigger erp_admin_templates_set_updated_at before update on public.erp_admin_templates
for each row execute function public.erp_set_updated_at();

drop trigger if exists erp_store_work_updates_set_updated_at on public.erp_store_work_updates;
create trigger erp_store_work_updates_set_updated_at before update on public.erp_store_work_updates
for each row execute function public.erp_set_updated_at();

drop trigger if exists erp_store_goal_settings_set_updated_at on public.erp_store_goal_settings;
create trigger erp_store_goal_settings_set_updated_at before update on public.erp_store_goal_settings
for each row execute function public.erp_set_updated_at();

drop trigger if exists erp_searchad_store_credentials_set_updated_at on public.erp_searchad_store_credentials;
create trigger erp_searchad_store_credentials_set_updated_at before update on public.erp_searchad_store_credentials
for each row execute function public.erp_set_updated_at();

insert into public.erp_admin_templates (template_key, title, description, definition)
values
  ('store_profile', '매장 정보 기본 폼', '신규 매장을 등록할 때 사용하는 공통 입력 항목입니다.',
    '{"sections":[{"title":"기본 정보","fields":["클라이언트명","매장명","업종","지역","담당자","관리 시작일"]},{"title":"플레이스·광고","fields":["플레이스 URL","플레이스 MID","검색광고 Customer ID"]}]}'::jsonb),
  ('owner_report', '사장님 업무 보고서 기본 폼', '공개 보고서에 표시할 업무·증빙의 공통 기준입니다.',
    '{"sections":["이번 주 회사 업무","대표님이 해야 할 일","완료 증빙"]}'::jsonb),
  ('information_guide', '정보안내문 기본 폼', '사장님에게 요청하는 초기 운영·마케팅 정보입니다.',
    '{"sections":[{"title":"기본정보","fields":["업체명","대표자명","대표님 연락처","매장 주소","매장 연락처","운영시간"]},{"title":"플레이스·광고","fields":["네이버 ID","플레이스 URL","플레이스 MID","검색광고 Customer ID"]},{"title":"매장 운영 정보","fields":["대표 메뉴","객단가","테이블 수","주력 시간대","주력 고객층","월 목표 매출"]},{"title":"마케팅 방향","fields":["현재 고민","강점·차별점","희망 키워드","기대하는 성과"]}]}'::jsonb)
on conflict (template_key) do nothing;
