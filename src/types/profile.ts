export interface IUpdateProfileData {
  firstName?: string;
  lastName?: string;
  // Email and phone are handled separately for verification purposes
}

export interface IUpdateSocialLinksData {
  twitter?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}
