import { removeMember } from "@/lib/actions/team";
import type { Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface TeamTableProps {
  members: Profile[];
  currentUserRole: Profile["role"];
}

const roleTone: Record<Profile["role"], "warning" | "info" | "neutral"> = {
  admin: "warning",
  member: "info",
  viewer: "neutral",
};

export function TeamTable({ members, currentUserRole }: TeamTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[var(--shadow-card)]">
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.22em] text-slate-400">
            <th className="px-5 py-4">Member</th>
            <th className="px-5 py-4">Role</th>
            <th className="px-5 py-4">Joined</th>
            <th className="px-5 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => (
            <tr key={member.id}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Avatar src={member.avatar_url} name={member.full_name} />
                  <div>
                    <p className="font-medium text-slate-900">{member.full_name ?? "Unnamed user"}</p>
                    <p className="text-sm text-slate-500">{member.email ?? "No email available"}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <Badge tone={roleTone[member.role]}>{member.role}</Badge>
              </td>
              <td className="px-5 py-4 text-sm text-slate-600">{formatDate(member.created_at)}</td>
              <td className="px-5 py-4 text-right">
                {currentUserRole === "admin" ? (
                  <form
                    action={async () => {
                      "use server";
                      await removeMember(member.id);
                    }}
                    className="inline-flex"
                  >
                    <Button type="submit" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </form>
                ) : (
                  <span className="text-sm text-slate-400">Restricted</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
