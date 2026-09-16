import type { FormItemRule } from "naive-ui";

// 普通文本
export const textRule: FormItemRule = {
  required: true,
  message: "Veuillez remplir les informations requises",
  trigger: ["blur"],
};

// 数字验证
export const numberRule: FormItemRule = {
  required: true,
  type: "number",
  message: "Veuillez saisir un nombre",
  trigger: ["input", "blur"],
};

// 邮箱验证
export const emailRule: FormItemRule = {
  required: true,
  message: "Veuillez saisir une adresse e-mail valide",
  trigger: ["input", "blur"],
  validator: (_: FormItemRule, value: any) => {
    if (!value) return new Error("Veuillez saisir une adresse e-mail");
    else if (
      !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
        value,
      )
    ) {
      return new Error("Veuillez saisir une adresse e-mail valide");
    }
    return true;
  },
};

// 手机号验证
export const phoneRule: FormItemRule = {
  required: true,
  type: "number",
  message: "Veuillez saisir un numéro de téléphone valide",
  trigger: ["input", "blur"],
  validator: (_: FormItemRule, value: any) => {
    if (!value) return new Error("Veuillez saisir un numéro de téléphone");
    else if (!/^1(3\d|4[5-9]|5[0-35-9]|6[567]|7[0-8]|8\d|9[0-35-9])\d{8}$/.test(value)) {
      return new Error("Veuillez saisir un numéro de téléphone valide");
    }
    return true;
  },
};
