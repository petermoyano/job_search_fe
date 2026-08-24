import { ProfileEditor } from "@/components/radar/profile-editor";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return <ProfileEditor profileId={profileId} />;
}
