'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Database } from '@/types/supabase';

type Question = Database['public']['Tables']['registration_questions']['Row'];

interface Props {
  questions: Question[];
  upsertAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save Question
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" loading={pending} className="text-white/60 hover:text-white">
      Remove
    </Button>
  );
}

export default function QuestionsManager({ questions, upsertAction, deleteAction }: Props) {
  return (
    <div className="space-y-8">
      {questions.map((question) => (
        <div key={question.id} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <form action={upsertAction} className="space-y-4">
            <input type="hidden" name="id" value={question.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`prompt-${question.id}`}>Prompt</Label>
                <Input id={`prompt-${question.id}`} name="prompt" defaultValue={question.prompt} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`field-${question.id}`}>Field Type</Label>
                <select
                  id={`field-${question.id}`}
                  name="field_type"
                  defaultValue={question.field_type}
                  className="w-full rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-fern-300 focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="select">Select</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`position-${question.id}`}>Position</Label>
                <Input id={`position-${question.id}`} name="position" type="number" defaultValue={question.position} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`options-${question.id}`}>Options (JSON)</Label>
              <Textarea
                id={`options-${question.id}`}
                name="options"
                rows={4}
                defaultValue={question.options ? JSON.stringify(question.options, null, 2) : ''}
                className="font-mono text-xs"
              />
              <p className="text-xs text-white/60">Only used for select & checkbox fields.</p>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 text-sm text-white/80">
                <input type="checkbox" name="required" defaultChecked={question.required} className="h-4 w-4" />
                Required field
              </label>
              <SaveButton />
            </div>
          </form>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={question.id} />
            <DeleteButton />
          </form>
        </div>
      ))}

      <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 backdrop-blur">
        <h3 className="text-lg font-semibold text-white">Add Question</h3>
        <p className="text-sm text-white/60">Collect the info you need from family members.</p>
        <form action={upsertAction} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-prompt">Prompt</Label>
            <Input id="new-prompt" name="prompt" placeholder="Do you have any dietary restrictions?" required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-field">Field Type</Label>
              <select
                id="new-field"
                name="field_type"
                className="w-full rounded-lg border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-fern-300 focus:outline-none"
              >
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select</option>
                <option value="checkbox">Checkbox</option>
                <option value="date">Date</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-position">Position</Label>
              <Input id="new-position" name="position" type="number" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-options">Options (JSON)</Label>
            <Textarea id="new-options" name="options" rows={4} className="font-mono text-xs" placeholder='[{"label":"Yes","value":"yes"}]' />
          </div>
          <label className="flex items-center gap-3 text-sm text-white/80">
            <input type="checkbox" name="required" className="h-4 w-4" />
            Required
          </label>
          <SaveButton />
        </form>
      </div>
    </div>
  );
}
