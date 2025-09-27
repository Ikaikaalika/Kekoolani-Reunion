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
        <h2 className="text-2xl font-semibold text-white">Registration Questions</h2>
        <p className="text-sm text-white/70">Customize the form fields family members see during registration.</p>
      </div>
      <QuestionsManager questions={questions} upsertAction={upsertQuestion} deleteAction={deleteQuestion} />
    </div>
  );
}
