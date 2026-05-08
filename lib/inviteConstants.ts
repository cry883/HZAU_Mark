/** 用户注册成功后系统为其生成的邀请码：最多拉新人数 */
export const USER_INVITE_MAX_USES = 10;
/** 用户邀请码自创建起有效天数 */
export const USER_INVITE_VALID_DAYS = 30;

/** 首码 / 运营种子码（与 seed 一致，便于文档与校验） */
export const BOOTSTRAP_INVITE_CODE = "HZAU2026";
export const BOOTSTRAP_INVITE_MAX_USES = 200;
export const BOOTSTRAP_INVITE_VALID_DAYS = 180;

export function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
