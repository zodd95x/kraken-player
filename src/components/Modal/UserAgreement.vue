<template>
  <div class="user-agreement" data-no-i18n>
    <n-h1 class="title">{{ agreement.title }}</n-h1>
    <n-scrollbar class="scrollbar">
      <n-flex class="date" justify="center">
        <n-tag round>{{ agreement.effectiveDate }}</n-tag>
        <n-tag type="warning" round>{{ agreement.updatedDate }}</n-tag>
        <n-tag type="info" round>{{ agreement.version }}</n-tag>
      </n-flex>
      <n-alert type="warning" :title="agreement.importantTitle">{{
        agreement.importantNotice
      }}</n-alert>
      <n-p v-for="paragraph in agreement.introduction" :key="paragraph">{{ paragraph }}</n-p>
      <template v-for="section in agreement.sections" :key="section.title">
        <n-h3 prefix="bar">{{ section.title }}</n-h3>
        <n-ol>
          <n-li v-for="item in section.items" :key="item">{{ item }}</n-li>
          <n-li v-if="section.licenseLinkPrefix">
            {{ section.licenseLinkPrefix }}
            <n-a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank">
              GNU Affero General Public License v3.0
            </n-a>
          </n-li>
        </n-ol>
      </template>
      <n-card ref="readOverRef">{{ agreement.acceptance }}</n-card>
    </n-scrollbar>
    <n-flex justify="center">
      <n-button v-if="isElectron" type="error" @click="closeApp">{{ agreement.decline }}</n-button>
      <n-button type="success" @click="agreeToAgreement" :disabled="!isReadOver">
        {{ isReadOver ? agreement.accept : agreement.scrollToEnd }}
      </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { CURRENT_AGREEMENT_VERSION } from "@/constants/agreement";
import { isElectron } from "@/utils/env";

type Agreement = {
  title: string;
  effectiveDate: string;
  updatedDate: string;
  version: string;
  importantTitle: string;
  importantNotice: string;
  introduction: string[];
  sections: Array<{ title: string; items: string[]; licenseLinkPrefix?: string }>;
  acceptance: string;
  decline: string;
  accept: string;
  scrollToEnd: string;
};

const agreements: Record<"en" | "fr" | "zh", Agreement> = {
  en: {
    title: "License agreement and terms of use",
    effectiveDate: "Effective date: July 16, 2024",
    updatedDate: "Updated: December 10, 2025",
    version: "Version: v2.0",
    importantTitle: "Important notice",
    importantNotice:
      "Kraken Player is free, open-source music player software released under AGPL-3.0. It never charges users. If you paid a third party for it, you may have been scammed. Stop using it and report it immediately.",
    introduction: [
      'Welcome to Kraken Player (the "Software"), a local music player that may use third-party APIs to extend its features.',
      'This agreement is a legal agreement between you (the "User") and the Kraken Player development team (the "Developer"). By downloading, installing, or using the Software, you accept these terms.',
    ],
    sections: [
      {
        title: "Using the software",
        items: [
          "The Software plays audio files stored on your device.",
          "The Developer may modify, update, or discontinue the Software and its features without notice.",
          "The User must be of legal age or use the Software under the supervision of a parent or legal guardian.",
        ],
      },
      {
        title: "Open-source license",
        items: [
          "The Software is open source and released under AGPL-3.0.",
          "The User must comply with AGPL-3.0 when using, modifying, or redistributing Kraken Player.",
        ],
        licenseLinkPrefix: "The full license is available at:",
      },
      {
        title: "Third-party services",
        items: [
          "The Software may use third-party APIs for features such as lyrics and album artwork.",
          "The User must comply with each provider's terms and privacy policy. The Developer is not responsible for the accuracy, legality, or availability of third-party APIs.",
        ],
      },
      {
        title: "User responsibilities",
        items: [
          "The User must comply with applicable law, obtain music files legally, and respect third-party rights.",
          "The Software must not be used for unlawful activities, including copyright infringement, malware distribution, or unlawful data collection.",
        ],
      },
      {
        title: "Intellectual property",
        items: [
          "Except for AGPL-3.0 components, the Software and its content belong to the Developer or its licensors and are protected by intellectual-property laws.",
          "Without written permission, the User may not copy, modify, distribute, sell, or rent the Software or its content.",
        ],
      },
      {
        title: "Disclaimer and limitation of liability",
        items: [
          'The Software is provided "as is" without express or implied warranties.',
          "To the fullest extent permitted by law, the Developer is not liable for indirect damages or for an amount above that actually paid for the Software.",
        ],
      },
      {
        title: "Termination, privacy, and changes",
        items: [
          "The Developer may terminate this agreement at any time. The User must then stop using the Software and delete all copies.",
          "The Software may use information to provide and improve its services. The Developer undertakes not to sell users' information to third parties.",
          "The Developer may update this agreement. Updated terms will be communicated through appropriate means.",
        ],
      },
      {
        title: "General provisions",
        items: [
          "This agreement is governed by applicable law. If any provision is invalid, the remaining provisions remain effective.",
          "This is the entire agreement concerning use of the Software.",
        ],
      },
    ],
    acceptance:
      'If you accept these terms, click "Accept and continue". If you refuse, click "Decline" to exit the application.',
    decline: "Decline",
    accept: "Accept and continue",
    scrollToEnd: "Please scroll to the bottom",
  },
  fr: {
    title: "Contrat de licence et conditions d'utilisation",
    effectiveDate: "Date d'effet : 16 juillet 2024",
    updatedDate: "Mise à jour : 10 décembre 2025",
    version: "Version : v2.0",
    importantTitle: "Déclaration importante",
    importantNotice:
      "Kraken Player est un lecteur de musique gratuit et open-source publié sous licence AGPL-3.0. Il ne facturera jamais ses utilisateurs. Si un tiers vous l'a fait payer, vous avez peut-être été victime d'une escroquerie : cessez de l'utiliser et signalez-le immédiatement.",
    introduction: [
      'Bienvenue sur Kraken Player (le "Logiciel"), un lecteur de musique local pouvant utiliser des API tierces pour enrichir ses fonctionnalités.',
      'Ce contrat est un accord juridique entre vous (l\'"Utilisateur") et l\'équipe de développement de Kraken Player (le "Développeur"). En téléchargeant, installant ou utilisant le Logiciel, vous acceptez les présentes conditions.',
    ],
    sections: [
      {
        title: "Utilisation du logiciel",
        items: [
          "Le Logiciel lit les fichiers audio stockés sur votre appareil.",
          "Le Développeur peut modifier, mettre à jour ou interrompre le Logiciel et ses fonctionnalités sans préavis.",
          "L'Utilisateur doit être majeur ou utiliser le Logiciel sous la supervision d'un parent ou tuteur légal.",
        ],
      },
      {
        title: "Licence open-source",
        items: [
          "Le Logiciel est open-source et publié sous licence AGPL-3.0.",
          "L'Utilisateur doit respecter l'AGPL-3.0 lors de l'utilisation, de la modification ou de la redistribution de Kraken Player.",
        ],
        licenseLinkPrefix: "Le texte complet de la licence est disponible à l'adresse suivante :",
      },
      {
        title: "Services tiers",
        items: [
          "Le Logiciel peut utiliser des API tierces, notamment pour les paroles et les pochettes d'album.",
          "L'Utilisateur doit respecter les conditions et politiques de confidentialité de chaque fournisseur. Le Développeur n'est pas responsable de l'exactitude, de la légalité ou de la disponibilité des API tierces.",
        ],
      },
      {
        title: "Responsabilités de l'utilisateur",
        items: [
          "L'Utilisateur doit respecter les lois applicables, obtenir ses fichiers musicaux légalement et respecter les droits de tiers.",
          "Le Logiciel ne doit pas être utilisé pour des activités illégales, notamment la violation du droit d'auteur, la diffusion de logiciels malveillants ou la collecte illégale de données.",
        ],
      },
      {
        title: "Propriété intellectuelle",
        items: [
          "À l'exception des composants AGPL-3.0, le Logiciel et son contenu appartiennent au Développeur ou à ses concédants et sont protégés par les lois sur la propriété intellectuelle.",
          "Sans autorisation écrite, l'Utilisateur ne peut copier, modifier, distribuer, vendre ou louer le Logiciel ou son contenu.",
        ],
      },
      {
        title: "Exclusion de garantie et responsabilité",
        items: [
          'Le Logiciel est fourni "en l\'état", sans garantie expresse ou implicite.',
          "Dans toute la mesure permise par la loi, le Développeur n'est pas responsable des dommages indirects ni d'un montant supérieur à celui effectivement payé pour le Logiciel.",
        ],
      },
      {
        title: "Résiliation, confidentialité et modifications",
        items: [
          "Le Développeur peut résilier cet accord à tout moment. L'Utilisateur doit alors cesser d'utiliser le Logiciel et en supprimer toutes les copies.",
          "Le Logiciel peut utiliser certaines informations pour fournir et améliorer ses services. Le Développeur s'engage à ne pas vendre les informations des utilisateurs à des tiers.",
          "Le Développeur peut mettre à jour ce contrat. Les nouvelles conditions seront communiquées par des moyens appropriés.",
        ],
      },
      {
        title: "Dispositions générales",
        items: [
          "Ce contrat est régi par les lois applicables. Si une clause est invalide, les autres dispositions restent applicables.",
          "Ce contrat constitue l'intégralité de l'accord concernant l'utilisation du Logiciel.",
        ],
      },
    ],
    acceptance:
      'Si vous acceptez ces conditions, cliquez sur "Accepter et continuer". Si vous refusez, cliquez sur "Refuser" pour quitter l\'application.',
    decline: "Refuser",
    accept: "Accepter et continuer",
    scrollToEnd: "Veuillez faire défiler jusqu'en bas",
  },
  zh: {
    title: "许可协议与使用条款",
    effectiveDate: "生效日期：2024 年 7 月 16 日",
    updatedDate: "更新日期：2025 年 12 月 10 日",
    version: "版本：v2.0",
    importantTitle: "重要声明",
    importantNotice:
      "Kraken Player 是依据 AGPL-3.0 发布的免费开源音乐播放器，永远不会向用户收费。若您曾向第三方付费获取本软件，您可能遭遇了诈骗；请停止使用并立即举报。",
    introduction: [
      "欢迎使用 Kraken Player（以下简称“软件”）。本软件是本地音乐播放器，可能使用第三方 API 扩展功能。",
      "本协议是您（“用户”）与 Kraken Player 开发团队（“开发者”）之间的法律协议。下载、安装或使用本软件即表示您接受本协议。",
    ],
    sections: [
      {
        title: "软件使用",
        items: [
          "本软件用于播放存储在您设备上的音频文件。",
          "开发者可在不另行通知的情况下修改、更新或停止软件及其功能。",
          "用户应已达到法定年龄，或在父母、监护人监督下使用本软件。",
        ],
      },
      {
        title: "开源许可",
        items: [
          "本软件以 AGPL-3.0 许可证开源发布。",
          "用户在使用、修改或再发布 Kraken Player 时必须遵守 AGPL-3.0。",
        ],
        licenseLinkPrefix: "完整许可证文本：",
      },
      {
        title: "第三方服务",
        items: [
          "本软件可能使用第三方 API，例如提供歌词或专辑封面。",
          "用户须遵守各服务提供方的条款与隐私政策；开发者不对第三方 API 的准确性、合法性或可用性负责。",
        ],
      },
      {
        title: "用户责任",
        items: [
          "用户须遵守适用法律，合法取得音乐文件，并尊重第三方权利。",
          "不得将本软件用于违法活动，包括侵犯著作权、传播恶意软件或非法收集数据。",
        ],
      },
      {
        title: "知识产权",
        items: [
          "除 AGPL-3.0 组件外，软件及其内容属于开发者或其许可方，并受知识产权法律保护。",
          "未经书面许可，用户不得复制、修改、发布、销售或出租软件及其内容。",
        ],
      },
      {
        title: "免责声明与责任限制",
        items: [
          "软件按“现状”提供，不作任何明示或默示保证。",
          "在法律允许范围内，开发者不对间接损失负责，责任金额不超过用户为软件实际支付的金额。",
        ],
      },
      {
        title: "终止、隐私与变更",
        items: [
          "开发者可随时终止本协议；用户届时须停止使用软件并删除所有副本。",
          "软件可能使用部分信息以提供和改进服务；开发者承诺不向第三方出售用户信息。",
          "开发者可更新本协议，并通过适当方式通知用户。",
        ],
      },
      {
        title: "一般条款",
        items: [
          "本协议受适用法律管辖。任一条款无效不影响其余条款的效力。",
          "本协议构成有关使用本软件的完整协议。",
        ],
      },
    ],
    acceptance: "如您接受这些条款，请点击“接受并继续”；如您拒绝，请点击“拒绝”退出应用。",
    decline: "拒绝",
    accept: "接受并继续",
    scrollToEnd: "请滚动到底部",
  },
};

const emit = defineEmits<{ close: [] }>();
const settingStore = useSettingStore();
const readOverRef = ref<HTMLElement | null>(null);
const isReadOver = useElementVisibility(readOverRef);
const agreement = computed(() => agreements[settingStore.language]);

const agreeToAgreement = () => {
  if (!isReadOver.value) return;
  settingStore.userAgreementVersion = CURRENT_AGREEMENT_VERSION;
  emit("close");
};

const closeApp = () => window.electron.ipcRenderer.send("quit-app");
</script>

<style lang="scss" scoped>
.user-agreement {
  :deep(.scrollbar) {
    max-height: 60vh;
    margin-bottom: 20px;
    .n-scrollbar-content {
      overflow: hidden;
      padding-right: 12px;
    }
  }
  .n-alert {
    margin: 20px 0;
  }
  .title {
    text-align: center;
  }
  .n-p,
  .n-ol {
    font-size: 16px;
  }
  .n-p {
    text-indent: 2em;
  }
  .n-card {
    --n-font-size: 18px;
    --n-border-radius: 12px;
    margin: 20px 0;
  }
}
</style>
