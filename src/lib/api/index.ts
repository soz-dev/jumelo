export { isSupabaseConfigured, getSupabase } from '../supabase';
export {
  ensureProfileRow,
  getProfileById,
  listProfiles,
  patchProfileFields,
  saveProfile,
  updateThemeId,
} from './profiles';
export { buildDataExport, deleteUserAccount } from './account';
export type { DataExportPayload, DeleteAccountResult } from './account';
export {
  createLike,
  dismissIncomingLike,
  hasIncomingLike,
  listIncomingLikes,
  markIncomingLikeRead,
} from './likes';
export {
  getOrCreateDmConversation,
  getDmPeerId,
  listMessages,
  listMyDmThreads,
  sendMessage,
  toChatMessage,
} from './messages';
export type { DbMessage, DmThread } from './messages';
export {
  ensureTeamChat,
  getTeamChatById,
  getTeamChatByTeamId,
  isTeamChatId,
  listTeamChatMessages,
  listTeamChatsForMember,
  removeTeamChat,
  resetTeamChatsDemoState,
  sendTeamChatMessage,
  teamChatIdFor,
} from './teamChats';
export type { TeamChatRecord } from './teamChats';
export {
  approveJoinRequest,
  dissolveTeam,
  getTeam,
  kickMember,
  listJoinRequestsForTeam,
  listTeams,
  membershipState,
  rejectJoinRequest,
  requestJoin,
  resetTeamsDemoState,
} from './teams';
export type { TeamMembershipState } from './teams';
