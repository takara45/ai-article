import type React from 'react';

export enum PlanType {
  Normal = 'Normal',
  Expert = 'Expert',
  Affiliate = 'Affiliate',
  ForeignLanguage = 'ForeignLanguage',
}

export interface Plan {
  type: PlanType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export type ArticleStatus = '下書き' | '投稿済み';

export type Tone = 'Normal' | 'Casual' | 'Formal';

export type Language = 'English' | 'Mandarin' | 'Cantonese' | 'Korean';

export interface HeadingImage {
  heading: string;
  imageBase64: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  createdAt: Date;
  status: ArticleStatus;
  plan: Plan;
  sources: GroundingSource[];
  eyecatchImage?: string;
  metaDescription: string;
  headingImages: HeadingImage[];
  userId?: string;
}

export interface WordPressCredentials {
  url: string;
  username: string;
  appPassword: string;
  siteName?: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}
