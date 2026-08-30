-- Overwrite recalculate_job_card_balance trigger function to subtract advance_paid
create or replace function public.recalculate_job_card_balance()
returns trigger as $$
declare
    target_jc_id uuid;
    total_paid numeric(10,2);
    jc_grand_total numeric(10,2);
    jc_advance_paid numeric(10,2);
begin
    if TG_OP = 'DELETE' then
        target_jc_id := old.job_card_id;
    else
        target_jc_id := new.job_card_id;
    end if;

    select coalesce(sum(amount), 0.00) into total_paid from public.payments
    where job_card_id = target_jc_id;

    select grand_total, advance_paid into jc_grand_total, jc_advance_paid from public.job_cards
    where id = target_jc_id;

    update public.job_cards
    set balance_due = jc_grand_total - coalesce(jc_advance_paid, 0.00) - total_paid
    where id = target_jc_id;

    return null;
end;
$$ language plpgsql;
