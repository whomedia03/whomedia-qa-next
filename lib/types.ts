export type Project = { id: string; name: string; alias: string; createdAt: string };
export type Video = { id: string; project: string; title: string; week: number; lesson: number; fileName: string; bytes: number; pathname: string; createdAt: string };
export type Review = { id: string; project: string; video: string; author: string; text: string; time: number; timestampAttached?: boolean; status: 'pending' | 'approved' | 'changes'; createdAt: string };
export type Data = { projects: Project[]; videos: Omit<Video, 'pathname'>[]; reviews: Review[]; baseUrl: string };
