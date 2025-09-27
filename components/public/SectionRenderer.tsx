/* eslint-disable @next/next/no-img-element */
import type { DynamicSection, SectionContentMap } from '@/lib/sections';

interface SectionRendererProps {
  section: DynamicSection;
}

function renderBodyCopy(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph, index) => (
      <p key={index} className="text-base leading-7 text-slate-600">
        {paragraph.trim()}
      </p>
    ));
}

function SectionWrapper({
  section,
  children
}: {
  section: DynamicSection;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      {section.title ? (
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold text-slate-900">{section.title}</h2>
        </div>
      ) : null}
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function TextSection({ section }: { section: DynamicSection<'text'> }) {
  return <SectionWrapper section={section}>{renderBodyCopy(section.content.body)}</SectionWrapper>;
}

function PhotoGallerySection({ section }: { section: DynamicSection<'photo_gallery'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="grid gap-4 md:grid-cols-3">
        {section.content.images.map((image, index) => (
          <div key={`${image.src}-${index}`} className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-lg">
            <img src={image.src} alt={image.alt ?? 'Gallery image'} className="h-56 w-full object-cover" />
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

function AgendaSection({ section }: { section: DynamicSection<'agenda'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="space-y-4">
        {section.content.items.map((item, index) => (
          <div key={`${item.time}-${index}`} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-ocean-500">{item.time}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{item.description}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

function ContactSection({ section }: { section: DynamicSection<'contact'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="grid gap-4 md:grid-cols-2">
        {section.content.contacts.map((contact, index) => (
          <div key={`${contact.name}-${index}`} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow">
            <p className="text-lg font-semibold text-slate-900">{contact.name}</p>
            {contact.role ? <p className="text-sm text-slate-600">{contact.role}</p> : null}
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              {contact.email ? (
                <p>
                  <span className="font-medium text-slate-800">Email:</span> {contact.email}
                </p>
              ) : null}
              {contact.phone ? (
                <p>
                  <span className="font-medium text-slate-800">Phone:</span> {contact.phone}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {section.content.note ? (
        <p className="text-sm text-slate-500">{section.content.note}</p>
      ) : null}
    </SectionWrapper>
  );
}

function FAQSection({ section }: { section: DynamicSection<'faq'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="space-y-3">
        {section.content.faqs.map((item, index) => (
          <details key={`${item.question}-${index}`} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <summary className="cursor-pointer text-lg font-semibold text-slate-900">{item.question}</summary>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </SectionWrapper>
  );
}

function CTASection({ section }: { section: DynamicSection<'cta'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="rounded-3xl bg-gradient-to-r from-fern-400 to-ocean-500 p-8 text-white shadow-xl">
        {renderBodyCopy(section.content.body)}
        {section.content.buttonText && section.content.buttonHref ? (
          <a
            href={section.content.buttonHref}
            className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-ocean-600 shadow"
          >
            {section.content.buttonText}
          </a>
        ) : null}
      </div>
    </SectionWrapper>
  );
}

function CustomHtmlSection({ section }: { section: DynamicSection<'custom_html'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="prose prose-lg prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: section.content.html }} />
    </SectionWrapper>
  );
}

const SectionComponent: Record<keyof SectionContentMap, (props: SectionRendererProps) => JSX.Element | null> = {
  text: ({ section }) => <TextSection section={section as DynamicSection<'text'>} />,
  photo_gallery: ({ section }) => <PhotoGallerySection section={section as DynamicSection<'photo_gallery'>} />,
  agenda: ({ section }) => <AgendaSection section={section as DynamicSection<'agenda'>} />,
  contact: ({ section }) => <ContactSection section={section as DynamicSection<'contact'>} />,
  faq: ({ section }) => <FAQSection section={section as DynamicSection<'faq'>} />,
  cta: ({ section }) => <CTASection section={section as DynamicSection<'cta'>} />,
  custom_html: ({ section }) => <CustomHtmlSection section={section as DynamicSection<'custom_html'>} />
};

export default function SectionRenderer({ section }: SectionRendererProps) {
  const Component = SectionComponent[section.type as keyof SectionContentMap];
  if (!Component) return null;
  return <Component section={section} />;
}
