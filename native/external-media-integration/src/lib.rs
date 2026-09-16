#![deny(missing_docs)]

//! 一个 Electron 的原生插件，用于将播放信息同步到系统媒体控件
//!
//! 目前支持 Windows、Linux 和 MacOS 的媒体控件交互

use napi::{
    Result,
    bindgen_prelude::{Function, Unknown},
    threadsafe_function::UnknownReturnValue,
};
use napi_derive::napi;

mod logger;
mod model;
mod sys_media;

use model::{MetadataParam, MetadataPayload, PlayModePayload, PlayStatePayload, SystemMediaEvent, TimelinePayload};

/// 初始化插件
///
/// ### 参数
///
/// * `log_dir` - 要把日志文件保存到的路径
///
/// ### Errors
///
/// 可能会在日志初始化失败，或者媒体控件初始化失败时抛出错误
///
/// ### 备注
///
/// 如果其他 API 调用失败，则只会打印日志并静默失败
#[napi]
pub fn initialize(log_dir: String) -> Result<()> {
    logger::init(log_dir).map_err(|e| napi::Error::from_reason(e.to_string()))?;

    sys_media::get_platform_controls()
        .initialize()
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    Ok(())
}

/// 关闭插件，清理资源
#[napi]
pub fn shutdown() {
    let _ = sys_media::get_platform_controls().shutdown();
}

/// 启用媒体控件
///
/// ### Errors
///
/// 会在调用 API 失败时抛出错误
#[napi]
pub fn enable_system_media() -> Result<()> {
    sys_media::get_platform_controls()
        .enable()
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// 禁用媒体控件
///
/// ### Errors
///
/// 会在调用 API 失败时抛出错误
#[napi]
pub fn disable_system_media() -> Result<()> {
    sys_media::get_platform_controls()
        .disable()
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// 注册媒体控件的事件回调 (上一首、下一首、暂停、播放等)
///
/// ### 参数
///
/// `(event: SystemMediaEvent) => void`
///
/// ### Errors
///
/// 如果 N-API 创建线程安全函数失败，会抛出错误。通常不应该发生，除非 JS 环境已经销毁了
#[napi(ts_args_type = "callback: (arg: SystemMediaEvent) => void")]
#[allow(clippy::needless_pass_by_value)]
pub fn register_event_handler(
    callback: Function<Unknown<'static>, UnknownReturnValue>,
) -> Result<()> {
    let tsfn = callback
        .build_threadsafe_function::<SystemMediaEvent>()
        .build_callback(|ctx| Ok(ctx.value))?;

    sys_media::get_platform_controls()
        .register_event_handler(tsfn)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    Ok(())
}

/// 更新歌曲元数据
///
#[napi]
pub fn update_metadata(payload: MetadataParam) {
    let internal_payload = MetadataPayload::from(payload);
    sys_media::get_platform_controls().update_metadata(internal_payload);
}

/// 更新播放状态 (播放/暂停)
///
#[napi]
pub fn update_play_state(payload: PlayStatePayload) {
    sys_media::get_platform_controls().update_playback_status(payload);
}

/// 更新播放速率
///
#[napi]
pub fn update_playback_rate(rate: f64) {
    sys_media::get_platform_controls().update_playback_rate(rate);
}

/// 更新音量
///
#[napi]
pub fn update_volume(volume: f64) {
    sys_media::get_platform_controls().update_volume(volume);
}

/// 更新进度信息
///
#[napi]
pub fn update_timeline(payload: TimelinePayload) {
    sys_media::get_platform_controls().update_timeline(payload);
}

/// 更新播放模式
///
#[napi]
pub fn update_play_mode(payload: PlayModePayload) {
    sys_media::get_platform_controls().update_play_mode(payload);
}
