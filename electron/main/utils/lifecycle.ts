/**
 * 应用退出生命周期标志
 * 用于在 before-quit 时区分「用户主动关闭窗口」与「应用退出」，
 * 避免退出时把任务栏歌词等窗口的可见性状态误写为 false（保证下次启动可恢复）。
 */
let appQuitting = false;

/** 标记应用正在退出 */
export const setAppQuitting = (): void => {
  appQuitting = true;
};

/** 应用是否正在退出 */
export const isAppQuitting = (): boolean => appQuitting;
