import QuestionsManager from '@/components/admin/QuestionsManager';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { upsertQuestion, deleteQuestion } from '@/lib/actions/questions';

async function getQuestions() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('registration_questions')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  return data ?? [];
}

export default async function AdminQuestionsPage() {
  const questions = await getQuestions();

  return (
    <div className="space-y-6">
      <div>
        <p className="section-title">Registration</p>
        <h2 className="mt-3 text-3xl font-semibold text-sand-900">Registration Questions</h2>
        <p className="mt-2 text-sm text-koa">Customize the form fields family members see during registration.</p>
      </div>
      <QuestionsManager questions={questions} upsertAction={upsertQuestion} deleteAction={deleteQuestion} />
    </div>
  );
}
