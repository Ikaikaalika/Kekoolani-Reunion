import QuestionsManager from '@/components/admin/QuestionsManager';
import RegistrationFieldsManager from '@/components/admin/RegistrationFieldsManager';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { upsertQuestion, deleteQuestion } from '@/lib/actions/questions';
import { upsertRegistrationField, deleteRegistrationField } from '@/lib/actions/registrationFields';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type QuestionRow = Database['public']['Tables']['registration_questions']['Row'];
type QuestionTicketRow = Database['public']['Tables']['registration_question_tickets']['Row'];
type RegistrationFieldRow = Database['public']['Tables']['registration_fields']['Row'];

async function getQuestions() {
  const supabase = createSupabaseServerClient();
  const [{ data: questionsData }, { data: ticketsData }, { data: linksData }, { data: fieldsData }] = await Promise.all([
    supabase
      .from('registration_questions')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase.from('ticket_types').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('registration_question_tickets').select('question_id, ticket_type_id'),
    supabase.from('registration_fields').select('*').order('position', { ascending: true }).order('created_at', { ascending: true })
  ]);

  const questions = (questionsData as QuestionRow[] | null) ?? [];
  const tickets = (ticketsData as TicketRow[] | null) ?? [];
  const links = (linksData as QuestionTicketRow[] | null) ?? [];
  const fields = (fieldsData as RegistrationFieldRow[] | null) ?? [];
  const ticketAssignments = links.reduce<Record<string, string[]>>((acc, link) => {
    if (!acc[link.question_id]) {
      acc[link.question_id] = [];
    }
    acc[link.question_id].push(link.ticket_type_id);
    return acc;
  }, {});

  return { questions, tickets, ticketAssignments, fields };
}

export default async function AdminQuestionsPage() {
  const { questions, tickets, ticketAssignments, fields } = await getQuestions();

  return (
    <div className="space-y-10">
      <div>
        <p className="section-title">Registration</p>
        <h2 className="mt-3 text-3xl font-semibold text-sand-900">Registration Questions</h2>
        <p className="mt-2 text-sm text-koa">Customize the form fields family members see during registration.</p>
      </div>
      <section className="space-y-6">
        <div>
          <p className="section-title">Core Fields</p>
          <h3 className="mt-2 text-2xl font-semibold text-sand-900">Participant Details</h3>
          <p className="mt-2 text-sm text-koa">
            Edit the core participant fields collected for each attendee.
          </p>
        </div>
        <RegistrationFieldsManager fields={fields} upsertAction={upsertRegistrationField} deleteAction={deleteRegistrationField} />
      </section>
      <section className="space-y-6">
        <div>
          <p className="section-title">Additional Questions</p>
          <h3 className="mt-2 text-2xl font-semibold text-sand-900">Custom Questions</h3>
          <p className="mt-2 text-sm text-koa">Manage extra questions and link them to specific ticket types.</p>
        </div>
        <QuestionsManager
          questions={questions}
          tickets={tickets}
          ticketAssignments={ticketAssignments}
          upsertAction={upsertQuestion}
          deleteAction={deleteQuestion}
        />
      </section>
    </div>
  );
}
