import Image from "next/image";

type PageLeadProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  chapter: string;
};

export function PageLead({ eyebrow, title, description, image, imageAlt, chapter }: PageLeadProps) {
  return <div className="page-lead">
    <div className="page-lead-copy"><span className="eyebrow">FOOD FLOW / {eyebrow}</span><h1>{title}</h1><p>{description}</p><span className="page-lead-chapter">{chapter} / GOOD FOOD. EVERY MOOD.</span></div>
    <div className="page-lead-image"><Image src={image} alt={imageAlt} fill loading="eager" sizes="(max-width: 650px) 100vw, 32vw" draggable={false}/></div>
  </div>;
}
