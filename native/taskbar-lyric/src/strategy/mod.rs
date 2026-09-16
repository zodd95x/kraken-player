use windows::Win32::{
    Foundation::HWND,
    UI::WindowsAndMessaging::{
        GWL_EXSTYLE, GWL_STYLE, GetParent, HWND_TOP, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE,
        SWP_NOSIZE, SetParent, SetWindowPos, WINDOW_EX_STYLE, WINDOW_STYLE, WS_CAPTION,
        WS_CHILD, WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW, WS_MAXIMIZEBOX,
        WS_MINIMIZEBOX, WS_POPUP, WS_SYSMENU, WS_THICKFRAME,
    },
};

use crate::utils::modify_window_long;

mod win10;
mod win11;

/// win10/win11 共用的嵌入逻辑：把 child_wnd reparent 到 parent_wnd，去掉标题栏 / 边框等装饰位，
/// 加上 LAYERED + TOOLWINDOW + NOACTIVATE。parent_wnd 为空时返回 false 不做任何修改
pub(super) fn embed_child_window(child_wnd: HWND, parent_wnd: HWND) -> bool {
    if parent_wnd.0.is_null() {
        return false;
    }

    // SAFETY: child_wnd 由调用方校验过有效性（take_valid_hwnd），parent_wnd 是 init 时拿到的任务栏
    unsafe {
        modify_window_long(child_wnd, GWL_STYLE, |raw_style| {
            let style = WINDOW_STYLE(raw_style);
            let mask = WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU;
            ((style | WS_CHILD) & !(WS_POPUP | mask)).0
        });

        let _ = SetParent(child_wnd, Some(parent_wnd));

        modify_window_long(child_wnd, GWL_EXSTYLE, |raw_style| {
            let ex_style = WINDOW_EX_STYLE(raw_style);
            (ex_style | WS_EX_LAYERED | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE).0
        });

        // SetParent 后子窗口默认沉到兄弟窗口最底层（任务栏按钮之后），定位正确也看不见；
        // 顶到最上（不激活、不改位置尺寸）才能真正显示
        raise_child_window(child_wnd);
    }
    true
}

/// 兜底自愈：子窗口的父窗口丢失时（如嵌入失败、任务栏重建后 HWND 变化），
///
/// 重新执行完整嵌入，否则窗口会以桌面为父窗口漂浮在屏幕左上、盖住主窗口。
/// 每次布局更新都会调用，丢失后几秒内自动恢复
pub(super) fn ensure_embedded(child_wnd: HWND, parent_wnd: HWND) -> bool {
    if child_wnd.0.is_null() || parent_wnd.0.is_null() {
        return false;
    }
    // SAFETY: 两个句柄都已判空，GetParent 对非法句柄返回 Err 而非崩溃
    let parent_ok = unsafe { GetParent(child_wnd) }
        .map(|current| current == parent_wnd)
        .unwrap_or(false);
    if parent_ok {
        return true;
    }
    embed_child_window(child_wnd, parent_wnd)
}

/// 把已嵌入的子窗口顶到任务栏子窗口最上（不激活、不改位置尺寸），布局变化后可重复调用
/// 注意：绝不能带 SWP_SHOWWINDOW——隐藏窗口（清空列表时）必须保持隐藏，
/// 显示与否只由 Electron 层（showInactive/hide）决定，否则 hide 会被布局更新立刻撤销
pub(super) fn raise_child_window(child_wnd: HWND) {
    if child_wnd.0.is_null() {
        return;
    }
    unsafe {
        let _ = SetWindowPos(
            child_wnd,
            Some(HWND_TOP),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        );
    }
}

pub use win10::LegacyStrategy;
pub use win11::Win11Strategy;

#[derive(Debug, Clone, Copy)]
pub struct LayoutParams {
    pub lyric_width: i32,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl Rect {
    pub fn union(&mut self, other: &Self) {
        if self.width == 0 && self.height == 0 {
            *self = *other;
            return;
        }
        if other.width == 0 && other.height == 0 {
            return;
        }

        let my_right = self.x + self.width;
        let my_bottom = self.y + self.height;
        let other_right = other.x + other.width;
        let other_bottom = other.y + other.height;

        let new_left = self.x.min(other.x);
        let new_top = self.y.min(other.y);
        let new_right = my_right.max(other_right);
        let new_bottom = my_bottom.max(other_bottom);

        self.x = new_left;
        self.y = new_top;
        self.width = new_right - new_left;
        self.height = new_bottom - new_top;
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct AvailableSpace {
    pub left: Rect,
    pub right: Rect,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SystemType {
    Win10,
    Win11,
}

#[derive(Debug, Clone, Copy)]
pub struct ExtraLayoutInfo {
    pub system_type: SystemType,
    pub is_centered: bool,
    /// 任务栏是否为浅色主题（读自 `SystemUsesLightTheme`）
    pub is_light: bool,
}

#[derive(Debug, Clone, Copy)]
pub struct TaskbarLayout {
    pub space: AvailableSpace,
    pub extra: ExtraLayoutInfo,
}

pub trait TaskbarStrategy {
    fn init(&mut self) -> bool;
    fn embed_window(&self, child_hwnd: HWND) -> bool;
    fn update_layout(&mut self, params: LayoutParams) -> Option<TaskbarLayout>;
    fn restore(&self);
}
