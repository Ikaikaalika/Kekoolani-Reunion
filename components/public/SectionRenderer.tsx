/* eslint-disable @next/next/no-img-element */
import type { DynamicSection, SectionContentMap, SectionType } from '@/lib/sections';
import { normalizeCopy } from '@/lib/copy';

interface SectionRendererProps {
  section: DynamicSection;
}

const SECTION_IDS: Partial<Record<SectionType, string>> = {
  faq: 'faq',
  contact: 'contact-section'
};

function renderBodyCopy(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph, index) => (
      <p key={index} className="text-base leading-7 text-current">
        {normalizeCopy(paragraph.trim())}
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
  const sectionId = SECTION_IDS[section.type as SectionType];

  return (
    <section id={sectionId} className="section">
      <div className="container max-w-5xl">
        {section.title ? (
          <div className="mb-8 text-center">
            <h2 className="h2">{section.title}</h2>
          </div>
        ) : null}
        <div className="space-y-6">{children}</div>
      </div>
    </section>
  );
}

function TextSection({ section }: { section: DynamicSection<'text'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="text-koa">{renderBodyCopy(section.content.body)}</div>
    </SectionWrapper>
  );
}

function PhotoGallerySection({ section }: { section: DynamicSection<'photo_gallery'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="grid gap-4 md:grid-cols-3">
        {section.content.images.map((image, index) => (
          <div key={`${image.src}-${index}`} className="card shadow-soft overflow-hidden">
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
          <div key={`${item.time}-${index}`} className="card shadow-soft p-5">
            <p className="mono text-xs uppercase tracking-[0.3em] text-koa">{item.time}</p>
            <p className="mt-2 text-lg font-semibold text-black">{normalizeCopy(item.description)}</p>
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
          <div key={`${contact.name}-${index}`} className="card shadow-soft p-5">
            <p className="text-lg font-semibold text-black">{contact.name}</p>
            {contact.role ? <p className="text-sm text-koa">{normalizeCopy(contact.role)}</p> : null}
            <div className="mt-3 space-y-1 text-sm text-koa">
              {contact.email ? (
                <p>
                  <span className="font-medium text-black">Email:</span> {contact.email}
                </p>
              ) : null}
              {contact.phone ? (
                <p>
                  <span className="font-medium text-black">Phone:</span> {contact.phone}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {section.content.note ? (
        <p className="text-sm text-koa">{normalizeCopy(section.content.note)}</p>
      ) : null}
    </SectionWrapper>
  );
}

function FAQSection({ section }: { section: DynamicSection<'faq'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="space-y-3">
        {section.content.faqs.map((item, index) => (
          <details key={`${item.question}-${index}`} className="card shadow-soft p-5">
            <summary className="cursor-pointer text-lg font-semibold text-black">{normalizeCopy(item.question)}</summary>
            <p className="mt-3 text-sm leading-6 text-koa">{normalizeCopy(item.answer)}</p>
          </details>
        ))}
      </div>
    </SectionWrapper>
  );
}

function CTASection({ section }: { section: DynamicSection<'cta'> }) {
  return (
    <SectionWrapper section={section}>
      <div className="rounded-3xl bg-gradient-to-r from-brandGreen to-brandBlue p-8 text-white shadow-soft">
        <div className="text-white">{renderBodyCopy(section.content.body)}</div>
        {section.content.buttonText && section.content.buttonHref ? (
          <a
            href={section.content.buttonHref}
            className="btn btn-secondary mt-6"
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
      <div className="prose prose-lg prose-slate max-w-none text-koa" dangerouslySetInnerHTML={{ __html: section.content.html }} />
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
