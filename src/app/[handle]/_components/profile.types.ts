export type ProfileIdentity = {
  handle: string;
  displayName: string | null;
  ownerPubkey: string
  subPath?: string;
};

export type ProfileDetails = ProfileIdentity & {
  bio: string | null;
};
