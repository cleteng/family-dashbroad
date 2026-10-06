import {
  loadDisplayPayload,
  lookupDisplayToken,
  touchDisplayToken,
} from "@/lib/display-tokens";
import { DisplayBoard } from "@/components/display/DisplayBoard";
import { DisplayError } from "@/components/display/DisplayError";

/** Never cache: token enable/disable must take effect on next request. */
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

export default async function DisplayPage({ params }: PageProps) {
  const { token } = await params;

  if (!token || token.length < 8) {
    return (
      <DisplayError
        title="链接无效或已失效"
        message="请检查展示链接是否正确。"
      />
    );
  }

  const lookup = lookupDisplayToken(token);
  if (lookup.status === "not_found") {
    return (
      <DisplayError
        title="链接无效或已失效"
        message="请检查展示链接是否正确。"
      />
    );
  }
  if (lookup.status === "disabled") {
    return (
      <DisplayError
        title="该展示链接已被禁用"
        message="请联系管理员重新开启展示。"
      />
    );
  }

  touchDisplayToken(lookup.tokenId);
  const payload = loadDisplayPayload(lookup.dashboardId);
  if (!payload) {
    return (
      <DisplayError
        title="链接无效或已失效"
        message="请检查展示链接是否正确。"
      />
    );
  }

  return <DisplayBoard widgets={payload.widgets} layouts={payload.layouts} />;
}
