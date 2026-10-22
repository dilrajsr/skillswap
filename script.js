/**
 * SkillSwap - Compatibility Bridge
 * Forwards legacy calls to window.SkillSwapStorage and window.SkillSwapEngine
 */

window.getUsers = () => window.SkillSwapStorage.getUsers();
window.getCurrentUser = () => window.SkillSwapStorage.getCurrentUser();
window.logout = () => window.SkillSwapStorage.logout();
