import { requireAdminPagePermission } from "@/lib/auth/guard";
import { TemplateEditor } from "@/components/admin/planning/TemplateEditor";

export default async function TemplateEditorPage({ params }: { params: { templateId: string } }) {
  await requireAdminPagePermission("planning_admin");
  return <TemplateEditor templateId={params.templateId} />;
}
