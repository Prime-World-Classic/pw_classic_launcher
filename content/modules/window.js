import { DOM } from './dom.js';
import { ParentEvent } from './parentEvent.js';
import { Lang } from './lang.js';
import { View } from './view.js';
import { App } from './app.js';
import { NativeAPI } from './nativeApi.js';
import { Castle } from './castle.js';
import { Settings } from './settings.js';
import { Sound } from './sound.js';
import { Splash } from './splash.js';
import { Shop } from './shop.js';
import { Voice } from './voice.js';
import { MM } from './mm.js';
import { Build } from './build.js';
import { Timer } from './timer.js';
import { HelpSplash } from './helpSpalsh.js';
import { domAudioPresets } from './domAudioPresets.js';
import { SOUNDS_LIBRARY } from './soundsLibrary.js';

// windows
import { keybindings } from './keybindings/keybindings.window.js';

export class Window {
  static windows = {};
  static windowOrder = [];
  static async show(category, method, value, value2, value3) {
    if (!(method in Window)) {
      return;
    }
    if (category === 'main' && method !== 'build') {
      try {
        View.setCastleOpenedBuildHero(0);
      } catch {}
    }
    let template = await Window[method](value, value2, value3);
    template.requestClose = () => {
      Window.close(category);
    };
    if (category === 'main' && method === 'keybindings') {
      const previousMethod = typeof value === 'string' ? value : 'settings';
      template.requestClose = () => {
        Window.show(category, previousMethod);
      };
    }
    let closeButton = DOM(
      {
        domaudio: domAudioPresets.closeButton,
        style: 'close-button',
        title: Lang.text('titleClose'),
        event: [
          'click',
          () => {
            Window.close(category);
            requestAnimationFrame(() => Voice.updatePanelPosition());
          },
        ],
      },
      DOM({
        tag: 'img',
        src: 'content/icons/close-cropped.svg',
        alt: Lang.text('titleClose'),
        style: 'close-image-style',
      }),
    );
    template.append(closeButton);
    if (category in Window.windows) {
      Window.windows[category].remove();
      const index = Window.windowOrder.indexOf(category);
      if (index > -1) {
        Window.windowOrder.splice(index, 1);
      }
    }
    Window.windows[category] = template;

    Window.windowOrder.unshift(category);

    View.active.append(template);
  }

  static close(category) {
    if (category === 'main') {
      try {
        const closingWindow = Window.windows[category];
        if (closingWindow?.id === 'wbuild') {
          View.setCastleOpenedBuildHero(0);
        }
      } catch {}
    }

    if (category === 'main' && typeof Build !== 'undefined' && Build.cleanup) {
      Build.cleanup();
    }

    if (category === 'main') {
      const windowElement = Window.windows[category];

      if (windowElement) {
        // Окно звонка
        if (windowElement.id === 'wcastle-call') {
          Sound.stop('ui-call');
          Window.callData = null;
        }

        // Окно приглашения
        if (windowElement.id === 'wcastle-invite') {
          if (Window.inviteTimeout) {
            clearTimeout(Window.inviteTimeout);
            Window.inviteTimeout = null;
          }
          Window.inviteData = null;
        }
      }
    }

    if (category in Window.windows) {
      if (Window.windows[category].cleanup) {
        Window.windows[category].cleanup();
      }
      Window.windows[category].remove();
      delete Window.windows[category];
      const index = Window.windowOrder.indexOf(category);
      if (index > -1) {
        Window.windowOrder.splice(index, 1);
      }
      return true;
    }
    return false;
  }
  static closeLast() {
    if (Window.windowOrder.length > 0) {
      const lastCategory = Window.windowOrder[0]; // Берем первый элемент (последний открытый)
      if (lastCategory === 'main') {
        const currentWindow = Window.windows['main'];
        if (currentWindow && currentWindow.id === 'wcastle-call') {
          Sound.stop('ui-call');
          Window.callData = null;
        }
        if (currentWindow.id === 'wcastle-invite') {
          if (Window.inviteTimeout) {
            clearTimeout(Window.inviteTimeout);
            Window.inviteTimeout = null;
          }
          Window.inviteData = null;
        }
      }
      return this.close(lastCategory);
    }
    return false;
  }
  static anyOpen() {
    return Window.windowOrder.length > 0;
  }
  static async steamauth() {
    return DOM(
      { id: 'wsteamauth' },
      DOM({ style: 'castle-menu-title' }, Lang.text('steamauthTitle')),
      DOM(
        { style: 'castle-menu-items' },
        DOM({ style: 'castle-menu-text' }, Lang.text('steamauth')),
        DOM(
          {
            domaudio: domAudioPresets.defaultButton,
            style: 'castle-menu-item-button',
            event: [
              'click',
              () => {
                ParentEvent.children = window.open(
                  'https://api2.26rus-game.ru:2087',
                  'SteamAuth',
                  'width=1280, height=720, top=' +
                    (screen.height - 720) / 2 +
                    ', left=' +
                    (screen.width - 1280) / 2 +
                    ', toolbar=no, menubar=no, location=no, scrollbars=no, resizable=no, status=no',
                );
              },
            ],
          },
          Lang.text('continue'),
        ),
      ),
    );
  }
  static async build(heroId, targetId = 0, isWindow = false) {
    let viewBuild = await View.build(heroId, targetId, isWindow);
    requestAnimationFrame(() => Voice.updatePanelPosition());
    return DOM({ id: 'wbuild' }, viewBuild);
  }
  static async top(hero = 0, mode = 0) {
    let viewTop = await View.top(hero, true, mode);
    return DOM({ id: 'wtop' }, viewTop);
  }
  static async farm() {
    let view = await View.game(true);
    return DOM({ id: 'wgame' }, view);
  }
    static async clans() {
     
  
    const clanRolesList = {
      Lider: {
        icon: "content/clanImages/main1234567899123.png",
        label: Lang.text("clanLeader")
      },
      Colider: {
        icon: "content/clanImages/main12345678991234.png",
        label: Lang.text("clanDeputy")
      },
      Member: {
        icon: "content/clanImages/main123456789912.png",
        label: Lang.text("clanMember")
      }
    };

    const clanData = {
      userRole:  "lider",
      clanStatistics: {
          clanName: "ClanName",
          clanTag: "clanTag",
          clanLvl: "47",
          placeInWorld: "15",
          playersInClan: "78",
          clanRating: "21133",
          clanGerb: 'content/clanImages/GuildB.png',
      },
      clanMembers: [
        { name: "Игрок1", role: "Lider", state: "В замке", dailyPoints: "125", totalPoints: "4210" },
        { name: "Игрок2", role: "Colider", state: "В замке", dailyPoints: "125", totalPoints: "4210" },
        { name: "Игрок3", role: "Member", state: "В замке", dailyPoints: "125", totalPoints: "4210" }
      ],
      clanQuests: [
        { questsName: "Охотник", questsTask: "Убить 100 чуди в режиме пограничье", questsAward: "10" },
        { questsName: "Ритуал смерти", questsTask: "Совершить 5 ритуальных убийств в режиме пограничье", questsAward: "15" },
        { questsName: "Завоеватель", questsTask: "Поднять 300 флагштогов в режиме пограничье", questsAward: "12" }
      ],
      clanApplication: [
        { name: "PlayerName1", totalPoints: "12302", totaGames: "302", wonGames: "202" },
        { name: "PlayerName2", totalPoints: "12302", totaGames: "302", wonGames: "202" },
        { name: "PlayerName3", totalPoints: "12302", totaGames: "302", wonGames: "202" }
      ],
      clanTop: [
        { clanName: "ClanName1", icon: "content/clanImages/UnknowClanFlag.png", points: "133231023" },
        { clanName: "ClanName2", icon: "content/clanImages/UnknowClanFlag.png", points: "12341023" },
        { clanName: "ClanName3", icon: "content/clanImages/UnknowClanFlag.png", points: "122223" }
      ]
    };
  const userRole = clanData.userRole
    const SETTINGS_ICON = "content/clanImages/main123.png";
  
    const memberRows = clanData.clanMembers.map(row => {
      const roleData = clanRolesList[row.role] || clanRolesList.Member;
      const showPlayerInfo = (e) => {
  e.stopPropagation();

  const splashContent = DOM({ tag: "div", style: "splash-content" });

  const escHandler = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      Splash.hide();
      document.removeEventListener('keydown', escHandler, true);
    }
  };

  const closeHandler = (closeEvent) => {
    closeEvent.stopPropagation();
    Splash.hide();
    document.removeEventListener('keydown', escHandler, true);
  };

  const closeButton = DOM({
    tag: "div",
    style: "close-button",
    event: ["click", closeHandler]
  });
  closeButton.style.backgroundImage = "url(content/icons/close-cropped.svg)";

  const renderStatusButton = () => {
    if (userRole === 'lider' && row.role === 'Colider') {
      return DOM({ 
        style: "clanMembersButton", 
        tag: "button",
        event: ['click', () => {
          console.log('Demote to Member:', row.name);
          Splash.hide();
        }]
      }, Lang.text('clanStatusToMemberButton'));
    }
    if (userRole === 'lider' && row.role === 'Member') {
      return DOM({ 
        style: "clanMembersButton", 
        tag: "button",
        event: ['click', () => {
          console.log('Promote to Colider:', row.name);
          Splash.hide();
        }]
      }, Lang.text('clanStatusToColiderButton'));
    }
    if (userRole === 'coLider' && row.role === 'Member') {
      return DOM({ 
        style: "clanMembersButton", 
        tag: "button",
        event: ['click', () => {
          console.log('Promote to Colider:', row.name);
          Splash.hide();
        }]
      }, Lang.text('clanStatusToColiderButton'));
    }
    return DOM({ style: "clanMembersButton", tag: "button" }, Lang.text('appClanStatusButton'));
  };

  const statusButton = renderStatusButton();

  const renderButtonsList = () => {
    if (userRole === 'lider' && row.role === 'Lider') {
      return DOM({ style: "buttonsMembersMenuList" },
        DOM({ style: "clanMembersText" }, Lang.text('youAreLeaderText'))
      );
    }
    if (userRole == 'lider') {
      return DOM({style: "buttonsMembersMenuList"},
        DOM({ style: "clanMembersButton", tag: "button" }, Lang.text('addInFriendsButton')),
        DOM({ style: "clanMembersButton", tag: "button" }, Lang.text('addInPartyButton')),
        statusButton,
        DOM({ style: "clanMembersButton", tag: "button" }, Lang.text('kickFromClanButton'))
      );
    }
    if (userRole == 'coLider') {
      return DOM({style: "buttonsMembersMenuList"},
        DOM({ style: "clanMembersButton", tag: "button" }, Lang.text('addInFriendsButton')),
        DOM({ style: "clanMembersButton", tag: "button" }, Lang.text('addInPartyButton')),
        statusButton
      );
    }
    return DOM({style: "buttonsMembersMenuList"},
      DOM({ style: "clanMembersButton", tag: "button" }, Lang.text('addInFriendsButton')),
      DOM({ style: "clanMembersButton", tag: "button" }, Lang.text('addInPartyButton'))
    );
  };

  splashContent.append(
    DOM({ style: "splash-title" }, 
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('clanActionModal'))),
      DOM({style: "splashClanMemberMenu"},
        DOM({}, Lang.text("settingsSplashLabel") + '"' + row.name + '"'),
        renderButtonsList()
      )
    ),
    closeButton
  );

  document.addEventListener('keydown', escHandler, true);
  Splash.show(splashContent, false);
};
  
      return DOM(
        { style: "row__main__case__clan" },
        DOM(
          { id: "icon__clan_row" },
          DOM({ id: "first__clan__row", src: roleData.icon, alt: "", tag: "img" })
        ),
        DOM({ id: "member__clan_row" }, DOM({ tag: "p" }, row.name)),
        DOM({ id: "state__clan_row" }, DOM({ tag: "p" }, roleData.label)),
        DOM({ id: "den__o4ki__clan_row" }, DOM({ tag: "p" }, row.dailyPoints)),
        DOM({ id: "vsevremya__o4ki__clan_row" }, DOM({ tag: "p" }, row.totalPoints)),
        DOM(
          { id: "toppers__clan_row", style: "dropdown-clan", event: ["click", showPlayerInfo] },
          DOM({ src: SETTINGS_ICON, tag: "img" })
        )
      );
    });
  
    const questsList = clanData.clanQuests.map(quest => {
      return DOM(
        { style: "card-quests-clan" },
        DOM(
          { style: "quest-task-wrapper" },
          DOM({ style: "quest-task-name", tag: "p" }, quest.questsName),
          DOM({ id: "razd", src: "content/clanImages/Remove-bg.ai_1729794563453.png", alt: "", tag: "img" })
        ),
        DOM(
          { style: "back-wrapper-quests" },
          DOM({ style: "quest-task", tag: "span" }, quest.questsTask),
          DOM(
            { style: "img-list-back-quest" },
            DOM({ id: "backIcons", src: "content/clanImages/докт.png", alt: "", tag: "img" }),
            DOM({ id: "backIcons", src: "content/clanImages/адор.png", alt: "", tag: "img" })
          )
        ),
        DOM(
          { style: "send-wrapper" },
          DOM({ id: "award", tag: "div" }, Lang.text('clanAward')),
          DOM(
            { style: "quests-awards" },
            DOM({ src: "content/clanImages/award.png", alt: "", tag: "img" }),
            DOM({ tag: "span" }, `+${quest.questsAward}`)
          ),
          DOM(
            { style: "button-wrapper" },
            DOM({ id: "corner-button", src: "content/clanImages/left-under.png", alt: "", tag: "img" }),
            DOM({ type: "button", value: Lang.text("clanQuestTake"), style: "quests-accept-button", tag: "input" }),
            DOM({ id: "corner-button", src: "content/clanImages/right-under.png", alt: "", tag: "img" })
          )
        )
      );
    });
  
    const applicationsList = clanData.clanApplication.map(aplctn => {
      return DOM({ style: "application" }, 
        DOM({ style: "image-wrapper-application" },
          DOM({ id: "head", src: "content/clanImages/head.png", alt: "", tag: "img" })
        ),
        DOM({ style: "application-stats" },
          DOM({ tag: "span" }, Lang.text("clanApplicationsName"), DOM({ id: "gold_clan_font", tag: "span" }, aplctn.name)),
          DOM({ tag: "span" }, Lang.text("clanApplicationsPoints"), DOM({ id: "gold_clan_font", tag: "span" }, aplctn.totalPoints)),
          DOM({ tag: "span" }, Lang.text("clanApplicationsAllGame"), DOM({ id: "gold_clan_font", tag: "span" }, aplctn.totaGames)),
          DOM({ tag: "span" }, Lang.text("clanApplicationsWinGame"), DOM({ id: "gold_clan_font", tag: "span" }, aplctn.wonGames)),
        ),
        DOM({ style: "applications-aprove" },
          DOM({ id: "aprove", src: "content/clanImages/accept.png", alt: "", tag: "img" }),
          DOM({ id: "aprove", src: "content/clanImages/kick.png", alt: "", tag: "img" })
        )
      );
    });
  
    const clanTopList = clanData.clanTop.map((top, index) => {
      const i = index + 1;
      return DOM({ style: "row__main__case__clan" },
        DOM({ id: "icon__clan_row" }, i),
        DOM(
          { id: "Name__clan_row" },
          DOM(
            { tag: "span" },
            DOM({ id: "clanTopIcon", src: top.icon, alt: "", tag: "img" }),
            top.clanName
          )
        ),
        DOM({ id: "vsevremya__o4ki__clan_row" }, DOM({ tag: "p" }, top.points))
      );
    });
  
    const tab1 = DOM(
      { style: "tab-content", id: "tab1" },
      DOM(
        { style: "stats__main_wrapper" },
        DOM(
          { style: "top-side-main" },
          DOM(
            { style: "left-top-side" },
            DOM(
              { style: "clan-lvl-wrapper" },
              DOM(
                { style: "lvl-clan" },
                DOM(
                  { style: "top-lane" },
                  DOM({ src: "content/clanImages/headsmall.png", alt: "", tag: "img" }),
                  Lang.text("ClanStatistics")
                ),
                DOM(
                  { style: "lvl-box-top" },
                  DOM(
                    { style: "wrapper__clan__Stats_qwe" },
                    DOM(
                      { style: "wrap-left-stats-qwe" },
                      DOM({}, Lang.text("clanLevel"), DOM({ id: "gold_clan_font", tag: "span" }, clanData.clanStatistics.clanLvl)),
                      DOM({}, Lang.text("PlaceInTheWorld"), DOM({ id: "gold_clan_font", tag: "span" }, clanData.clanStatistics.placeInWorld)),
                      DOM({}, Lang.text("PlayersInTheClan"), DOM({ id: "gold_clan_font", tag: "span" }, `${clanData.clanStatistics.playersInClan}/80`))
                    ),
                    DOM(
                      { style: "wrap-right-stats-qwe" },
                      DOM({}, Lang.text("ClanRating"), DOM({ id: "gold_clan_font", tag: "span" }, clanData.clanStatistics.clanRating))
                    )
                  )
                )
              )
            )
          ),
          DOM(
            { style: "right-top-side" },
            DOM(
              { style: "message-day-wrapper" },
              DOM(
                { style: "message-day" },
                DOM(
                  { style: "top-lane" },
                  DOM({ src: "content/clanImages/main12345.png", alt: "", id: "day-message-logo", tag: "img" }),
                  Lang.text("DayMessage")
                ),
                DOM({ style: "message-box-top", id: "outputMassageDay" })
              )
            )
          )
        ),
        DOM(
          { style: "bottom-side-main-right" },
          DOM(
            { style: "stats-wrapperq" },
            DOM(
              { style: "stats__first" },
              DOM(
                { style: ["row__main__case__clan", "first__clan__row"] },
                DOM({ id: "icon__clan_row" }, DOM({ id: "first__clan__row", src: "content/clanImages/stats-head.png", alt: "", tag: "img" })),
                DOM({ id: "member__clan_row" }, DOM({ tag: "p" }, Lang.text("PlayerNameStatsBar"))),
                DOM({ id: "state__clan_row" }, DOM({ tag: "p" }, Lang.text("StatusStatsBar"))),
                DOM({ id: "den__o4ki__clan_row" }, DOM({ tag: "p" }, Lang.text("PointsPerDayStatsBar"))),
                DOM({ id: "vsevremya__o4ki__clan_row" }, DOM({ tag: "p" }, Lang.text("TotalPointsStatsBar"))),
                DOM({ id: "toppers__clan_row1" }, DOM({ tag: "p" }, Lang.text("SettingsStatsBar")))
              ),
              ...memberRows
            )
          )
        )
      )
    );
  
    const tab2 = DOM({ style: "tab-content", id: "tab2" }, 
      DOM({ style: "quests-wrapper" },
        DOM(
          { style: "progress-quests-bar" },
          DOM({ src: "content/clanImages/main1234567899123456789.png", alt: "", tag: "img", style: "quests-progress-bar-icon" }),
          DOM({ style: "lvl-clan-reward-wrapper" }, DOM({ style: "quests-awards1" }, DOM({ src: "content/clanImages/award.png", alt: "", tag: "img" }), DOM({ tag: "span" }, "+25"))),
          DOM({ src: "content/clanImages/main1234567899123456789.png", alt: "", tag: "img", style: "quests-progress-bar-icon" }),
          DOM({ style: "quests-awards1" }, DOM({ src: "content/clanImages/award.png", alt: "", tag: "img" }), DOM({ tag: "span" }, "+50")),
          DOM({ src: "content/clanImages/main1234567899123456789.png", alt: "", tag: "img", style: "quests-progress-bar-icon" }),
          DOM({ style: "quests-awards1" }, DOM({ src: "content/clanImages/award.png", alt: "", tag: "img" }), DOM({ tag: "span" }, "+100"))
        ),
        DOM({ style: "quests-display-wrapper" }, ...questsList),
        DOM({ style: "quests-alert-wrapper" }, DOM({ tag: "p" }, Lang.text("questsAlert")))
      )
    );
  
    const tab3 = DOM({ style: "tab-content", id: "tab3" },
  userRole == "lider" || userRole == "coLider"
  ? DOM({ style: "applications-main-wrapper" },
      DOM({ style: "wrap-add-witch-nickname" }, 
        DOM({ 
          style: "add_with_nickname", 
          tag: "button",
          domaudio: domAudioPresets.defaultButton,
          event: ['click', () => {
            const splashContent = DOM({ tag: "div", style: "splash-content" });
            
            const escHandler = (e) => {
              if (e.key === 'Escape' && Splash.body && Splash.body.contains(splashContent)) {
                e.preventDefault();
                e.stopPropagation();
                Splash.hide();
                document.removeEventListener('keydown', escHandler, true);
              }
            };
            
            const hideHandler = () => {
              Splash.hide();
              document.removeEventListener('keydown', escHandler, true);
            };
            
            const closeButton = DOM({
              tag: "div",
              style: "close-button",
              event: ["click", hideHandler]
            });
            closeButton.style.backgroundImage = "url(content/icons/close-cropped.svg)";
            
            const addPlayerContent = createAddPlayerSplash(hideHandler);
            
            splashContent.append(closeButton, addPlayerContent);
            
            document.addEventListener('keydown', escHandler, true);
            Splash.show(splashContent, false);
          }]
        }, Lang.text("addPlayerWithNickName"))
      ),
      DOM({ style: "applications-list" }, ...applicationsList)
    )
  : DOM({ style: "applications-main-wrapper" }, DOM({ tag: "span" }, "У вас нет должных полномочий"))
);
  
    const tab4 = DOM({ style: "tab-content", id: "tab4" },
      DOM({ style: "clan-rating-wrapper" }, ...clanTopList)
    );
  
    const tab5 = DOM({ style: "tab-content", id: "tab5" },
      DOM({ style: "settings-main-wrapper" },
        DOM({ style: "setting-top-section" },
          DOM({ style: "setting-first-section" },
            DOM({ style: "change-tag-name-board" },
              DOM({ id: "gerb-settings", src: clanData.clanStatistics.clanGerb, alt: "", tag: "img" }),
              DOM({ style: "clanNameTagWrapper" },
                DOM({ tag: "span" }, clanData.clanStatistics.clanName),
                DOM({ id: "clan-tag", tag: "span" }, clanData.clanStatistics.clanTag)
              )
            )
          )
        ),
        DOM(
          { style: "setting-bottom-section" },
          DOM(
            { style: "settings-third-section" },
            DOM({ style: "history-wrapper" }, DOM({ style: "settings-history-top-lane" }, Lang.text("clanJournal")), DOM({ style: "history-board" }))
          ),
          userRole == "lider"
            ? DOM({ style: "settings-fourth-section" },
                DOM({ style: "rename-clan-button", tag: "button" }, Lang.text("clanChangeName")),
                DOM({ style: "rename-clan-button", tag: "button" }, Lang.text("clanChangeGerb")),
                DOM({ style: "disban-clan-button", tag: "button" }, Lang.text("clanDisBan"))
              )
            : DOM({ style: "settings-fourth-section" }, DOM({ style: "disban-clan-button", tag: "button" }, Lang.text("Выйти из клана")))
        )
      )
    );
  
    let rightSideTab = 0;
    const rightSideContainer = DOM({ style: "right-side-clan" });
    let contentElement = tab1;
    rightSideContainer.appendChild(contentElement);
  
    function updateRightSideContent() {
      rightSideContainer.innerHTML = '';
      switch (rightSideTab) {
        case 0: contentElement = tab1; break;
        case 1: contentElement = tab2; break;
        case 2: contentElement = tab3; break;
        case 3: contentElement = tab4; break;
        case 4: contentElement = tab5; break;
        default: contentElement = tab1; break;
      }
      rightSideContainer.appendChild(contentElement);
    }
  
    function setActiveButton(targetButton, tabIndex) {
      document.querySelectorAll('.btn__clan').forEach(btn => {
        btn.classList.remove('active');
      });
      rightSideTab = tabIndex;
      targetButton.classList.add('active');
      updateRightSideContent();
    }
  
// === В НАЧАЛЕ метода clans() — отдельная переменная с контентом справки ===
const clanGuideContent = DOM({ style: 'clan-help-content' },
  DOM({ tag: "h2" }, "Руководство по клановой системе игры Prime World"),
  DOM({ tag: "br" }),
  DOM({ tag: "p" }, "Клан – это объединение игроков под одним гербом, выполняя задания и участвуя в совместных боях участники повышают уровень и продвигают свой клан на вершину пьедестала."),
  DOM({ tag: "br" }), DOM({ tag: "br" }),
  
  DOM({ tag: "h4" }, DOM({ tag: "b" }, "Задачи клана:")),
  DOM({ tag: "p" }, "- объединение в группы для совместной игры в режимах;"),
  DOM({ tag: "p" }, "- выполнение клановых заданий для повышения уровня клана;"),
  DOM({ tag: "p" }, "- накопление очков для повышения уровня клана."),
  DOM({ tag: "br" }), DOM({ tag: "br" }),
  
  DOM({ tag: "p" }, "По мере достижения последующих уровней клана, каждый участник в будущем сможет учувствовать в клановых войнах, а также получать бонусы на свой аккаунт."),
  
  DOM({ tag: "p" }, DOM({ tag: "b" }, "Подробнее по очкам клана:")),
  DOM({ tag: "p" }, 
    "– очки клана – это заработанный рейтинг каждого участника клана через бои;",
    DOM({ tag: "br" }),
    "– очки определяют уровень клана и сколько игроков может быть в клане;",
    DOM({ tag: "br" }),
    "– чем выше рейтинг клана (очки), тем больше игроков можно будет пригласить;",
    DOM({ tag: "br" }),
    "– за каждые 24 часа надо будет платить очками клана: количество игроков × 15 очков;",
    DOM({ tag: "br" }),
    "– глава клана и 4 вассала не могут быть исключены из клана, даже если уровень клана придёт к нулю;",
    DOM({ tag: "br" }),
    "– если игроков больше лимита, они будут автоматически удаляться (сортировка по бездействию)."
  ),
  DOM({ tag: "br" }),
  
  DOM({ tag: "p" }, 
    DOM({ tag: "b" }, "Ранговое распределение возможностей внутри клана:"), DOM({ tag: "br" }),
    "– глава клана: все возможности (смена имени/герба, управление игроками, аудит, ранги, квесты, роспуск);", DOM({ tag: "br" }),
    "– заместитель: приглашение/удаление игроков, аудит, квесты;", DOM({ tag: "br" }),
    "– участник: брать квесты, добывать очки клану."
  ),
  DOM({ tag: "br" }),
  DOM({ tag: "h2" }, "В будущем планируется расширение возможностей клана, а также новые механики.")
);

const createAddPlayerSplash = (hideHandler) => {
  return DOM({ style: 'splash-add-player' },
    DOM({ style: 'splash-title' }, 
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('addPlayerWithNickName')))
    ),
    DOM({ style: 'splash-add-player-content' },
      DOM({ tag: 'p', id: 'text-clans-modal', style: 'title-modal-text'}, Lang.text('addPlayerWithNickNameDesc')),
      DOM({ style: 'add-player-input-wrapper' },
        DOM({
          tag: 'input',
          type: 'text',
          id: 'addPlayerNickname',
          placeholder: Lang.text('enterNickname'),
          style: 'add-player-input'
        }),
        DOM({
          tag: 'button',
          style: 'clanMembersButton',
          domaudio: domAudioPresets.defaultButton,
          event: ['click', () => {
            const nickname = document.getElementById('addPlayerNickname')?.value?.trim();
            if (nickname) {
              Splash.hide();
            }
          }]
        }, Lang.text('inviteToAFriend'))
      )
    )
  );
};

const clanGuideSpan = DOM({
  tag: "span",
  style: "clanGuideSpan",
  domaudio: domAudioPresets.defaultButton,
  event: [
        'click',
        () => {
          HelpSplash(Lang.text('clanGuideContent'));
        },
  ]
}, DOM({ src: 'content/clanImages/clan-info.png', tag: 'img' }));

  
    const topSideWrapper = DOM(
      { style: "top__side__wrapper" },
      clanGuideSpan,
      DOM(
        { style: "clan-info-top-left-wrapper" },
        DOM(
          { style: "wrapper__clan__icon_icons" },
          DOM(
            { style: "clan__icon__wrapper" },
            DOM({ id: "beautifull-1", src: "content/clanImages/в-1.png", tag: "img" }),
            DOM({ id: "icon__clan__mainGZ", src: clanData.clanStatistics.clanGerb, tag: "img" }),
            DOM({ id: "beautifull-2", src: "content/clanImages/в-1.png", tag: "img" })
          )
        )
      ),
      DOM({ style: "clan-name" }, DOM({ tag: "span" }, clanData.clanStatistics.clanName)),
      DOM(
        { style: "lvl-box" },
        DOM(
          { style: "progrs-lvl-wrapper" },
          DOM({ style: "progrs-lvl-wrapper-text", tag: "span" }, Lang.text("clanProgress")),
          DOM({ id: "lvl-progress-clan", src: "content/clanImages/main1234567899123456789.png", tag: "img" })
        )
      )
    );
    topSideWrapper.style.position = "relative";
  
    return DOM(
  { style: 'clan-wapper', id: 'clan-wapper' },
  userRole !== "noClan"
    ? DOM(
        { style: 'main__clan__wrapper' },
        DOM(
          { style: "left-side-clan" },
          topSideWrapper,
          DOM(
            { style: "bottom__side__wrapper" },
            DOM(
              { style: "btns-list-clan" },
              DOM({ id: "tab-btn-1", style: ["btn__clan", "active"], tag: "button", event: ["click", (e) => setActiveButton(e.target, 0)] }, Lang.text("mainPage")),
              DOM({ id: "tab-btn-2", style: "btn__clan", tag: "button", event: ["click", (e) => setActiveButton(e.target, 1)] }, Lang.text("QuestsPage")),
              DOM({ id: "tab-btn-3", style: "btn__clan", tag: "button", event: ["click", (e) => setActiveButton(e.target, 2)] }, Lang.text("applicationsPage")),
              DOM({ id: "tab-btn-4", style: "btn__clan", tag: "button", event: ["click", (e) => setActiveButton(e.target, 3)] }, Lang.text("clansRatingPage")),
              DOM({ id: "tab-btn-5", style: "btn__clan", tag: "button", event: ["click", (e) => setActiveButton(e.target, 4)] }, Lang.text("settingsPage"))
            )
          )
        ),
        rightSideContainer
      )
    : DOM({ style: 'main__clan__wrapper' },
        DOM({ style: "clan-rating-wrapper" }, ...clanTopList)
      )
);
  }
  
  static async history() {
    let view = await View.history(true);
    return DOM({ id: 'whistory' }, view);
  }
  static async inventory() {
    let view = await View.inventory(true);
    return DOM({ id: 'winventory' }, view);
  }

  static async processShopAndCollection(request, isShop) {
    View.castleCrystalContainer.classList.remove('crystal-container-anim');
    let topHeroVictoryCount = { heroId: 1, skinId: 1, frameId: 0 };
    try {
      topHeroVictoryCount = await App.api.request(App.CURRENT_MM, 'getHeroWithFrameId');
    } catch (e) {
      App.error(e);
    }
    let category = {
      skin: DOM({ style: 'shop_items' }),
      flag: DOM({ style: 'shop_items' }),
      frame: DOM({ style: ['shop_items', 'shop_items_frames'] }),
    };

    function prepareItem(rItem) {
      let additionalMessage = DOM({ style: 'shop_category_hint' });
      let isEnabled = rItem.enabled;
      const categoryName = Shop.categories[rItem.categoryId];
      const isFrame = categoryName == 'frame';
      const isFlag = categoryName == 'flag';
      const isSkin = categoryName == 'skin';
      const isDefault = rItem.id == 0;
      let item = DOM({
        style: isFrame ? 'shop_item_img_frame' : 'shop_item_img',
      });
      let itemSrc = DOM({ style: 'shop_item_img' });
      let itemIcon = Shop.getIcon(rItem.categoryId, isFrame ? `${rItem.externalId}/${topHeroVictoryCount.frameId}` : rItem.externalId);
      item.style.backgroundImage = itemIcon[0];
      let itemName = Shop.getName(rItem.categoryId, rItem.externalId);
      const translatedName = Lang.text(itemName[0]);
      let srcTranslatedName = '';
      let frameItems = [item.cloneNode(), item.cloneNode(), item.cloneNode(), item.cloneNode()];
      if (isSkin) {
        itemSrc.style.backgroundImage = itemIcon[1]; //`url("content/hero/${heroId}/1.webp")`;
        srcTranslatedName = Lang.text(itemName[1]);
        let heroId_skinId = rItem.externalId.split('/');
        let heroId = heroId_skinId[0];
        let skinId = heroId_skinId[1];
        if (!isShop) {
          const currentHeroSkin = MM.hero.filter((hero) => {
            return hero.id == heroId;
          })[0].skin;
          isEnabled = currentHeroSkin != skinId;
        }
      }
      let shopItemBackground = DOM();
      if (isFrame) {
        shopItemBackground = DOM({ style: 'shop_item_img' });
        shopItemBackground.style.backgroundImage = `url("content/hero/${topHeroVictoryCount.heroId}/${topHeroVictoryCount.skinId}.webp")`;
        frameItems[1].style.backgroundImage = itemIcon[1];
        frameItems[2].style.backgroundImage = itemIcon[2];
        frameItems[3].style.backgroundImage = itemIcon[3];

        if (topHeroVictoryCount.frameId == 0 && !isDefault) {
          additionalMessage.appendChild(DOM({ style: 'splash-shop-item-hint' }, Lang.text('frame_hint')));
        }
        if (topHeroVictoryCount.frameId > 0 && !isDefault) {
          let targetShopItem = frameItems[topHeroVictoryCount.frameId - 1];
          targetShopItem.classList.add('shop_item_frame_animated');
        }
      }
      if (isFlag) {
        shopItemBackground = DOM({ style: 'shop_item_img_flag' });
        shopItemBackground.style.backgroundImage = item.style.backgroundImage;
        item.style.backgroundImage = `url("content/img/b7.png")`;
      }
      if (isSkin) {
        shopItemBackground = DOM({ style: 'shop_item_img_skin' });
        shopItemBackground.style.backgroundImage = `url("content/img/b2.png")`;
      }
      let shopItemContainerStyle = [
        isEnabled ? 'shop_item_container' : isShop ? 'shop_item_container_disabled' : 'shop_item_container_equipped',
      ];
      const showQuadFrame = isFrame && !isDefault;
      if (isSkin) {
        shopItemContainerStyle.push('show_item_container_double');
      }
      if (showQuadFrame) {
        shopItemContainerStyle.push('show_item_container_quadruple');
      }
      let shopItem = DOM(
        { style: shopItemContainerStyle, title: translatedName },
        isSkin
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), itemSrc),
              DOM({ style: 'shop_item_name' }, isSkin ? srcTranslatedName : ''),
            )
          : DOM(),
        !isFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground, item),
              DOM({ style: 'shop_item_name' }, isSkin ? translatedName : isFrame ? Lang.text('frame_req_1') : ''),
            )
          : DOM(),
        isFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), frameItems[0]),
              DOM({ style: 'shop_item_name' }, showQuadFrame ? Lang.text('frame_req_1') : Lang.text('frame_no_frame')),
            )
          : DOM(),
        showQuadFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), frameItems[1]),
              DOM({ style: 'shop_item_name' }, Lang.text('frame_req_2')),
            )
          : DOM(),
        showQuadFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), frameItems[2]),
              DOM({ style: 'shop_item_name' }, Lang.text('frame_req_3')),
            )
          : DOM(),
        showQuadFrame
          ? DOM(
              { style: 'shop_item' },
              DOM({ style: 'shop_item_img_container' }, shopItemBackground.cloneNode(), frameItems[3]),
              DOM({ style: 'shop_item_name' }, Lang.text('frame_req_4')),
            )
          : DOM(),
        isSkin ? DOM({ style: 'shop_item_arrow' }) : DOM(),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'shop_item_price_container',
            event: [
              'click',
              async () => {
                if (!shopItem.classList.contains('shop_item_container')) {
                  return;
                }
                if (isShop) {
                  Splash.show(
                    DOM(
                      {},
                      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('buyModalText'))),
                      DOM({ style: 'splash-item-container' }, isFlag ? shopItemBackground.cloneNode() : item.cloneNode()),
                      DOM(
                        { style: 'splash-item-text' },
                        Lang.text('windowShopBuyItem'),
                        DOM({ style: 'splash-shop-item-name' }, `${translatedName}`),
                        DOM({ tag: 'br' }),
                        Lang.text('windowShopItemPrice').replace('{rItem.price}', rItem.price),
                        DOM({
                          tag: 'img',
                          src: 'content/img/queue/DiamondBlue.png',
                          style: 'splash_shop_item_price_icon',
                        }),
                        `?`,
                        DOM({}, additionalMessage),
                      ),
                      DOM(
                        {
                          domaudio: domAudioPresets.bigButton,
                          style: 'splash-content-button',
                          event: [
                            'click',
                            async () => {
                              Splash.hide();
                              let crystalLeft = null;
                              try {
                                crystalLeft = await App.api.request('shop', 'buy', { id: rItem.id });
                                if (isSkin) {
                                  let heroId_skinId = rItem.externalId.split('/');
                                  let heroId = heroId_skinId[0];
                                  let skinId = heroId_skinId[1];
                                  await Build.changeSkinForHero(heroId, skinId);
                                }
                                // to refactor sound
                                Sound.play(SOUNDS_LIBRARY.BUY, {
                                  id: 'ui-buy',
                                  volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
                                });
                              } catch (e) {
                                App.error(e);
                                return;
                              }
                              if (Number.isInteger(crystalLeft)) {
                                View.castleTotalCrystal.firstChild.innerText = crystalLeft;
                              } else {
                                App.error(`Неизвестное число кристаллов: ${crystalLeft}`);
                              }
                              shopItem.classList.add('shop_item_container_disabled');
                              shopItem.classList.remove('shop_item_container');
                            },
                          ],
                        },
                        Lang.text('windowShopBuy'),
                      ),
                      DOM(
                        {
                          domaudio: domAudioPresets.closeButton,
                          style: 'splash-content-button-red',
                          event: [
                            'click',
                            async () => {
                              Splash.hide();
                            },
                          ],
                        },
                        Lang.text('windowShopCancel'),
                      ),
                    ),
                  );
                } else {
                  Splash.show(
                    DOM(
                      {},
                      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('equipment'))),
                      DOM({ style: 'splash-item-container' }, isFlag ? shopItemBackground.cloneNode() : item.cloneNode()),
                      isFrame && !showQuadFrame ? Lang.text('windowShopUnequipItem') : Lang.text('windowShopEquipItem'),
                      DOM(
                        { style: 'splash-shop-item-name' },
                        isFrame && !showQuadFrame ? Lang.text('windowShopCurrentFrame') : `${translatedName}`,
                      ),
                      '?',
                      DOM({}, additionalMessage),
                      DOM(
                        {
                          domaudio: domAudioPresets.bigButton,
                          style: 'splash-content-button',
                          event: [
                            'click',
                            async () => {
                              Splash.hide();
                              try {
                                if (isSkin) {
                                  let heroId_skinId = rItem.externalId.split('/');
                                  let heroId = heroId_skinId[0];
                                  let skinId = heroId_skinId[1];
                                  await Build.changeSkinForHero(heroId, skinId);
                                } else {
                                  if (isDefault) {
                                    await App.api.request('shop', 'applyDefault', { categoryId: rItem.categoryId });
                                  } else {
                                    await App.api.request('shop', 'apply', {
                                      id: rItem.id,
                                    });
                                  }
                                }
                              } catch (e) {
                                App.error(e);
                                return;
                              }
                              shopItem.classList.add('shop_item_container_equipped');
                              shopItem.classList.remove('shop_item_container');
                              shopItem.lastChild.firstChild.innerText = Lang.text('shop_in_use');
                              for (const collectionItem of category[categoryName].childNodes) {
                                if (collectionItem != shopItem) {
                                  collectionItem.classList.add('shop_item_container');
                                  collectionItem.classList.remove('shop_item_container_equipped');
                                  collectionItem.lastChild.firstChild.innerText = Lang.text('shop_use');
                                }
                              }
                            },
                          ],
                        },
                        isFrame && !showQuadFrame ? Lang.text('windowShopUnequip') : Lang.text('windowShopEquip'),
                      ),
                      DOM(
                        {
                          domaudio: domAudioPresets.closeButton,
                          style: 'splash-content-button-red',
                          event: [
                            'click',
                            async () => {
                              Splash.hide();
                            },
                          ],
                        },
                        Lang.text('windowShopCancel'),
                      ),
                    ),
                  );
                }
              },
            ],
          },
          isShop
            ? DOM({ style: 'shop_item_price' }, DOM({ style: 'shop_item_price_icon' }), rItem.price)
            : DOM({ style: 'shop_item_price' }, isEnabled ? Lang.text('shop_use') : Lang.text('shop_in_use')),
        ),
      );
      return shopItem;
    }
    for (const rItem of request) {
      const categoryName = Shop.categories[rItem.categoryId];
      category[categoryName].appendChild(prepareItem(rItem));
    }
    let shopSeparator = DOM(
      { style: 'shop_separator' },
      DOM({ style: 'shop_separator_left' }),
      DOM({ style: 'shop_separator_right' }),
      DOM({ style: 'shop_separator_center' }),
    );

    let shopHeader = DOM(
      { style: 'shop_header' },
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: ['shop_header_item', isShop ? 'shop_header_selected' : 'shop_header_not_selected'],
          event: ['click', async () => Window.show('main', 'shop')],
        },
        Lang.text('shop_shop'),
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: ['shop_header_item', !isShop ? 'shop_header_selected' : 'shop_header_not_selected'],
          event: ['click', async () => Window.show('main', 'collection')],
        },
        Lang.text('shop_collection'),
      ),
      shopSeparator.cloneNode(true),
    );

    let shopTimeLeft = DOM({ style: 'shop_bottom_time' }, Timer.getFormattedTimer(Shop.timeBeforeUpdate));

    let shopBottom = DOM({ style: 'shop_bottom' }, Lang.text('shop_bottom'), shopTimeLeft);

    let skins = DOM(
      {
        style: category.skin.childNodes.length == 0 ? 'shop_category_hidden' : 'shop_category',
      },
      DOM({ style: 'shop_category_header' }, Lang.text('shop_skins')),
      category.skin,
    );
    let flags = DOM(
      {
        style: category.flag.childNodes.length == 0 ? 'shop_category_hidden' : 'shop_category',
      },
      DOM({ style: 'shop_category_header' }, Lang.text('shop_flags')),
      category.flag,
    );
    let frames = DOM(
      {
        style: category.frame.childNodes.length == 0 ? 'shop_category_hidden' : 'shop_category',
      },
      DOM({ style: 'shop_category_header' }, Lang.text('shop_frames')),
      category.frame,
    );

    let helpBtn = DOM({
      id: 'wshop_help',
      domaudio: domAudioPresets.defaultButton,
      style: 'help-button',
      event: [
        'click',
        () => {
          HelpSplash(Lang.text('shop_help_content'));
        },
      ],
    });
    let wnd = DOM(
      { id: 'wshop' },
      helpBtn,
      shopHeader,
      DOM(
        {
          style: ['shop_with_scroll', isShop ? 'shop_with_scroll_shop' : '_dummy_'],
        },
        skins,
        flags,
        frames,
      ),
      isShop ? shopBottom : DOM(),
    );

    await Shop.retrieveLastUpdate();

    wnd.timeLeft = Shop.timeBeforeUpdate;

    function checkUpdate() {
      setTimeout((_) => {
        if (!('main' in Window.windows) || !(Window.windows['main'].id == 'wshop')) {
          return;
        }

        if (wnd.timeLeft <= 0) {
          Window.show('main', 'shop');
          return;
        }

        shopTimeLeft.innerText = Timer.getFormattedTimer(wnd.timeLeft);
        wnd.timeLeft -= 1000;
        checkUpdate();
      }, 1000);
    }

    checkUpdate();

    return wnd;
  }

  static async shop() {
    let request = await App.api.request('shop', 'available');
    //request.sort((x,y) => x.id - y.id );
    return await this.processShopAndCollection(request, true);
  }

  static async collection() {
    let request = await App.api.request('shop', 'purchase');

    return await this.processShopAndCollection(request, false);
  }

  static async quest(item) {
    let quest = await App.api.request('quest', 'get', { id: item.id });
    let helpBtn = DOM({
      id: 'wshop_help',
      domaudio: domAudioPresets.defaultButton,
      style: 'help-button',
      event: [
        'click',
        () => {
          HelpSplash(Lang.text('quest_help_content'));
        },
      ],
    });
    let root = DOM({ id: 'wquest' }, helpBtn);

    const content = DOM({ style: 'wquest__content' });

    const titlebar = DOM({ style: 'wquest__titlebar' });
    const h3 = DOM({ tag: 'h3', style: 'wquest__title' }, quest.title);

    titlebar.appendChild(h3);

    const body = DOM({ style: 'wquest__body' }, quest.description);

    const objective = DOM({ style: 'wquest__objective' }, quest.target);
    //const objText = DOM({ style: 'wquest__objective' }, quest.target);
    //objective.appendChild(objText);

    if (quest.total) {
      const counter = DOM({}, quest.score, ' / ', quest.total);
      //objText.append(counter);
	  objective.append(counter);
    }

    const tokens = item.reward;
    const rewards = DOM({ style: 'wquest__rewards' });
    for (let reward in item.reward) {
      const chip = DOM({ style: 'wquest__chip' });
      const icon = DOM({ style: 'wquest__chip-icon' });
      let iconUrl = '';
      switch (reward) {
        case 'crystal':
          iconUrl = `url("content/img/queue/DiamondBlue.png")`;
          break;
        default:
          iconUrl = `url("content/img/queue/Spravka.png")`;
      }
      icon.style.backgroundImage = iconUrl;

      const val = DOM({ style: 'wquest__chip-value' }, item.reward[reward]);
      chip.appendChild(icon);
      chip.appendChild(val);
      rewards.appendChild(chip);
    }

    const avatar = DOM({ style: 'wquest__avatar' });
    const avatarContainer = DOM({ style: 'quest_container' }, avatar);
    avatarContainer.style.backgroundImage = `url("content/img/quest/1.png")`;
    avatarContainer.style.backgroundSize = 'cover, contain';
    avatarContainer.style.backgroundPosition = 'center, center';
    avatarContainer.style.backgroundRepeat = 'no-repeat, no-repeat';

    avatar.style.backgroundImage = `url("content/hero/${item.heroId}/1.webp")`;
    avatar.style.backgroundSize = 'cover, contain';
    avatar.style.backgroundPosition = 'center, center';
    avatar.style.backgroundRepeat = 'no-repeat, no-repeat';

    content.appendChild(titlebar);
    content.appendChild(body);
    content.appendChild(objective);
    content.appendChild(rewards);
    content.appendChild(avatarContainer);

    switch (quest.status) {
      case 0:
        content.appendChild(
          DOM(
            {
              domaudio: domAudioPresets.bigButton,
              style: 'quest-accept-button',
              domaudio: domAudioPresets.defaultButton,
              event: [
                'click',
                async () => {
                  await App.api.request('quest', 'start', { id: quest.id });

                  Window.close('main');

                  View.castleQuestUpdate();
                },
              ],
            },
            DOM({ style: 'quest-button-text' }, 'Начать'),
          ),
        );

        break;

      case 2:
        content.appendChild(
          DOM(
            {
              domaudio: domAudioPresets.finishQuestButton,
              style: 'quest-accept-button',
              domaudio: domAudioPresets.defaultButton,
              event: [
                'click',
                async () => {
                  await App.api.request('quest', 'finish', { id: quest.id });

                  Window.close('main');

                  View.castleQuestUpdate();
                },
              ],
            },
            DOM({ style: 'quest-button-text' }, 'Завершить'),
          ),
        );

        break;
    }

    root.appendChild(content);

    return root;
  }

  static async menu() {
    return DOM(
      { id: 'wcastle-menu' },
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('menu'))),
      DOM(
        { style: 'castle-menu-items' },
        App.isAdmin()
          ? DOM(
              { style: 'castle-menu-item-button' },
              DOM({ domaudio: domAudioPresets.bigButton, event: ['click', () => Window.show('main', 'adminPanel')] }, 'Админ'),
            )
          : DOM(),
        DOM(
          { style: 'castle-menu-item-button' },
          DOM({ domaudio: domAudioPresets.bigButton, event: ['click', () => Window.show('main', 'accountPanel')] }, Lang.text('account')),
        ),
        DOM(
          { style: 'castle-menu-item-button' },
          DOM({ domaudio: domAudioPresets.bigButton, event: ['click', () => Window.show('main', 'settings')] }, Lang.text('preferences')),
        ),
        DOM(
          { style: 'castle-menu-item-button' },
          DOM({ domaudio: domAudioPresets.bigButton, event: ['click', () => Window.show('main', 'support')] }, Lang.text('support')),
        ),
        DOM(
          {
            domaudio: domAudioPresets.closeButton,
            style: 'castle-menu-item-button',
            event: [
              'click',
              async () => {
                App.exit();
                Splash.hide();
              },
            ],
          },
          Lang.text('accountSwitch'),
        ),
        DOM(
          {
            domaudio: domAudioPresets.closeButton,
            style: 'castle-menu-item-button',
            event: [
              'click',
              () => {
                if (NativeAPI.status) {
                  NativeAPI.exit();
                }
              },
            ],
          },
          Lang.text('exit'),
        ),
        DOM({ style: 'castle-menu-label' }, `${Lang.text('version')}: v.${App.PW_VERSION}`),
        DOM(
          { style: 'menu-icons' },
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://vk.com/primeworld',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/vk.webp',
              alt: 'VK',
              style: 'menu-icons',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://t.me/primeworldclassic',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/telegram.webp',
              alt: 'Telegram',
              style: 'menu-icons',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://discord.gg/MueeP3aAzh',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/discord.webp',
              alt: 'Discord',
              style: 'menu-icons',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://store.steampowered.com/app/3684820/Prime_World_Classic',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/steam2.webp',
              alt: 'Steam',
              style: 'menu-icons',
            }),
          ),
        ),
      ),
    );
  }

  static async settings() {
    let soundTestId = 'sound_test';
	
	 setTimeout(() => {
          const sliders = document.querySelectorAll('.castle-menu-slider');
          sliders.forEach(slider => {
              Window.updateSliderFill(slider);
          });
      }, 0);

	
    return DOM(
      { id: 'wcastle-menu' },
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('preferences'))),
      DOM(
        { style: 'castle-menu-items' },
        DOM(
          { style: 'castle-menu-label' },
          Lang.text('volume'),
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultButton,
            type: 'range',
            value: Settings.settings.globalVolume * 100,
            min: '0',
            max: '100',
            step: '1',
            style: 'castle-menu-slider',
            event: [
              'input',
              (e) => {
                Settings.settings.globalVolume = parseFloat(e.target.value) / 100;
                Settings.ApplySettings({ render: false, window: false });

                document.getElementById('global-volume-percentage').textContent = `${Math.round(Settings.settings.globalVolume * 100)}%`;
				Window.updateSliderFill(e.target);
              },
            ],
          }),
          DOM(
            {
              tag: 'span',
              id: 'global-volume-percentage',
              style: 'volume-percentage',
            },
            `${Math.round(Settings.settings.globalVolume * 100)}%`,
          ),
        ),
        DOM(
          { style: 'castle-menu-label' },
          Lang.text('volumeMusic'),
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultButton,
            type: 'range',
            value: Settings.settings.musicVolume * 100,
            min: '0',
            max: '100',
            step: '1',
            style: 'castle-menu-slider',
            event: [
              'input',
              (e) => {
                Settings.settings.musicVolume = parseFloat(e.target.value) / 100;
                Settings.ApplySettings({ render: false, window: false });

                document.getElementById('music-volume-percentage').textContent = `${Math.round(Settings.settings.musicVolume * 100)}%`;
				Window.updateSliderFill(e.target);
              },
            ],
          }),
          DOM(
            {
              tag: 'span',
              id: 'music-volume-percentage',
              style: 'volume-percentage',
            },
            `${Math.round(Settings.settings.musicVolume * 100)}%`,
          ),
        ),
        DOM(
          { style: 'castle-menu-label' },
          Lang.text('volumeSound'),
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultButton,
            type: 'range',
            value: Settings.settings.soundsVolume * 100,
            min: '0',
            max: '100',
            step: '1',
            style: 'castle-menu-slider',
            event: [
              'input',
              (e) => {
                Settings.settings.soundsVolume = parseFloat(e.target.value) / 100;
                Settings.ApplySettings({ render: false, window: false });

                if (!Castle.testSoundIsPlaying) {
                  Castle.testSoundIsPlaying = true;
                  Sound.play(
                    SOUNDS_LIBRARY.MM_FOUND,
                    {
                      id: soundTestId,
                      volume: Castle.GetVolume(Castle.AUDIO_SOUNDS),
                    },
                    () => {
                      Castle.testSoundIsPlaying = false;
                    },
                  );
                }

                document.getElementById('sounds-volume-percentage').textContent = `${Math.round(Settings.settings.soundsVolume * 100)}%`;
				Window.updateSliderFill(e.target);
              },
            ],
          }),
          DOM(
            {
              tag: 'span',
              id: 'sounds-volume-percentage',
              style: 'volume-percentage',
            },
            `${Math.round(Settings.settings.soundsVolume * 100)}%`,
          ),
        ),
        DOM(
          { style: 'castle-menu-label' },
          Lang.text('voiceVolume'),
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultButton,
            type: 'range',
            id: 'voice-volume-slider',
            value: Math.round((Number(Settings.settings.voiceVolume) || 1) * 100),
            min: '0',
            max: '100',
            step: '1',
            style: 'castle-menu-slider',
            event: [
              'input',
              (e) => {
                Settings.settings.voiceVolume = parseFloat(e.target.value) / 100;
                Voice.setVolumeLevel(Settings.settings.voiceVolume);
                document.getElementById('voice-volume-percentage').textContent = `${Math.round(Settings.settings.voiceVolume * 100)}%`;
                Window.updateSliderFill(e.target);
              },
            ],
          }),
          DOM(
            {
              tag: 'span',
              id: 'voice-volume-percentage',
              style: 'volume-percentage',
            },
            `${Math.round((Number(Settings.settings.voiceVolume) || 1) * 100)}%`,
          ),
        ),
        DOM(
          {
            style: 'castle-menu-item-button',
            domaudio: domAudioPresets.defaultButton,
            event: [
              'click',
              () => {
                Window.show('main', 'advancedSettings');
              },
            ],
          },
          Lang.text('advancedSettings'),
        ),
        DOM(
          {
            style: 'castle-menu-item-button',
            domaudio: domAudioPresets.defaultButton,
            event: [
              'click',
              async (e) => {
                const oldLanguage = Lang.target;
                Lang.toggle();
                Settings.settings.language = Lang.target;
                App.error(`${Lang.text('LangTarg')}: ${Lang.list[oldLanguage].name} → ${Lang.list[Lang.target].name}`);
                await Lang.reinitViews();
                await Window.show('main', 'settings');
              },
            ],
          },
          `${Lang.text('language')} (${Lang.target})`,
        ),
        // Добавленная кнопка "Клавиши"
        DOM(
          {
            style: 'castle-menu-item-button',
            event: [
              'click',
              () => {
                Window.show('main', 'keybindings', 'settings');
              },
            ],
          },
          Lang.text('keys'),
        ),
        // Кнопка "Назад"
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'castle-menu-item-button',
            event: [
              'click',
              () => {
                Window.show('main', 'menu');
              },
            ],
          },
          Lang.text('back'),
        ),
        /*,
				
				DOM({ style: 'castle-menu-label-description' }, Lang.text('soundHelp'))
				*/
      ),
    );
  }

  static async advancedSettings() {
    const voiceInWindowUnavailableByWindows = NativeAPI.isLegacyWindowsForVoiceWindow?.() === true;
    const voiceInWindowUnavailableByNwjs = NativeAPI.isLegacyNwjsForVoiceWindow?.() === true;
    const voiceInWindowUnavailable = voiceInWindowUnavailableByWindows || voiceInWindowUnavailableByNwjs;
    const voiceInWindowUnavailableTitle = voiceInWindowUnavailableByWindows
      ? Lang.text('voiceInWindowRequiresWin11')
      : voiceInWindowUnavailableByNwjs
        ? Lang.text('voiceInWindowRequiresNwjs')
        : '';
    if (voiceInWindowUnavailable) {
      Settings.settings.voiceInWindow = false;
    }

    return DOM(
      { id: 'wcastle-menu' },
      DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, Lang.text('advancedSettings'))),
      DOM(
        { style: 'castle-menu-items' },
        DOM(
          { style: 'castle-menu-item-checkbox' },
          DOM(
            {
              tag: 'input',
              domaudio: domAudioPresets.defaultSelect,
              type: 'checkbox',
              id: 'fullscreen-toggle',
              checked: !Settings.settings.fullscreen,
              event: [
                'change',
                (e) => {
                  Settings.settings.fullscreen = !e.target.checked;
                  Settings.ApplySettings({ render: false, audio: false });
                },
              ],
            },
            { checked: Settings.settings.fullscreen },
          ),
          DOM({ tag: 'label', for: 'fullscreen-toggle' }, Lang.text('windowMode') + ' (F11)'),
        ),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          DOM({
            tag: 'input',
            domaudio: domAudioPresets.defaultSelect,
            type: 'checkbox',
            id: 'render-toggle',
            checked: Settings.settings.render,
            event: [
              'change',
              (e) => {
                Settings.settings.render = e.target.checked;
                Settings.ApplySettings({ audio: false, window: false });
              },
            ],
          }),
          DOM({ tag: 'label', for: 'render-toggle' }, Lang.text('threeD')),
        ),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          DOM(
            {
              tag: 'input',
              domaudio: domAudioPresets.defaultSelect,
              type: 'checkbox',
              id: 'radmin-priority',
              checked: Settings.settings.radminPriority,
              event: [
                'change',
                (e) => {
                  Settings.settings.radminPriority = e.target.checked;
                },
              ],
            },
            { checked: Settings.settings.radminPriority },
          ),
          DOM({ tag: 'label', for: 'radmin-priority' }, Lang.text('radminPriority')),
        ),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          DOM(
            {
              tag: 'input',
              domaudio: domAudioPresets.defaultSelect,
              type: 'checkbox',
              id: 'novoice',
              checked: Settings.settings.novoice,
              event: [
                'change',
                (e) => {
                  Settings.settings.novoice = e.target.checked;
                },
              ],
            },
            { checked: Settings.settings.novoice },
          ),
          DOM({ tag: 'label', for: 'novoice' }, Lang.text('voiceEnabled')),
        ),
        DOM(
          {
            style: voiceInWindowUnavailable ? ['castle-menu-item-checkbox', 'is-disabled'] : 'castle-menu-item-checkbox',
            title: voiceInWindowUnavailableTitle,
          },
          DOM(
            {
              tag: 'input',
              domaudio: domAudioPresets.defaultSelect,
              type: 'checkbox',
              id: 'voice-in-window',
              checked: !voiceInWindowUnavailable && Settings.settings.voiceInWindow !== false,
              disabled: voiceInWindowUnavailable,
              title: voiceInWindowUnavailableTitle,
              event: [
                'change',
                (e) => {
                  if (voiceInWindowUnavailable) {
                    Settings.settings.voiceInWindow = false;
                    e.target.checked = false;
                    return;
                  }
                  Settings.settings.voiceInWindow = e.target.checked;
                },
              ],
            },
            { checked: !voiceInWindowUnavailable && Settings.settings.voiceInWindow !== false },
          ),
          DOM({ tag: 'label', for: 'voice-in-window', title: voiceInWindowUnavailableTitle }, Lang.text('voiceInWindow')),
        ),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          DOM(
            {
              tag: 'input',
              domaudio: domAudioPresets.defaultSelect,
              type: 'checkbox',
              id: 'voice-radio-mode',
              checked: Settings.settings.voiceRadioMode,
              event: [
                'change',
                (e) => {
                  Settings.settings.voiceRadioMode = e.target.checked;
                },
              ],
            },
            { checked: Settings.settings.voiceRadioMode },
          ),
          DOM({ tag: 'label', for: 'voice-radio-mode' }, Lang.text('voiceRadioMode')),
        ),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'castle-menu-item-button',
            event: [
              'click',
              () => {
                Window.show('main', 'settings');
              },
            ],
          },
          Lang.text('back'),
        ),
      ),
    );
  }

  // static async keybindings() {
  //   async function findConfigFile() {
  //     const possiblePaths = [
  //       `${nw.App.getDataPath('documents')}/My Games/Prime World Classic/input_new.cfg`,
  //       `${process.env.USERPROFILE}/Documents/My Games/Prime World Classic/input_new.cfg`,
  //       `${process.env.USERPROFILE}/OneDrive/Documents/My Games/Prime World Classic/input_new.cfg`,
  //     ];

  //     for (const path of possiblePaths) {
  //       try {
  //         await fs.access(path);
  //         return path;
  //       } catch (e) {
  //         continue;
  //       }
  //     }
  //     return null;
  //   }

  //   const configPath = await findConfigFile();

  //   if (!configPath) {
  //     console.error('Не удалось найти файл конфигурации ни по одному из путей');
  //     return DOM(
  //       { id: 'wcastle-keybindings' },
  //       DOM({ style: 'castle-menu-error' }, Lang.text('keybindings_error', 'Не удалось найти файл конфигурации клавиш')),
  //       DOM(
  //         {
  //           domaudio: domAudioPresets.bigButton,
  //           class: 'castle-menu-item-button',
  //           event: ['click', () => Window.show('settings', 'menu')],
  //         },
  //         Lang.text('back', 'Назад'),
  //       ),
  //     );
  //   }

  //   const defaultKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  //   let currentBinds = {};
  //   let configReadError = false;

  //   try {
  //     const configContent = await fs.readFile(configPath, 'utf-8');
  //     const bindRegex = /bind cmd_action_bar_slot(\d+) '(.+?)'/g;
  //     let match;

  //     while ((match = bindRegex.exec(configContent)) !== null) {
  //       currentBinds[`slot${match[1]}`] = match[2];
  //     }
  //   } catch (e) {
  //     console.error('Ошибка чтения конфига:', e);
  //     configReadError = true;
  //   }

  //   return DOM(
  //     { id: 'wcastle-keybindings' },
  //     DOM({ style: 'castle-menu-title' }, Lang.text('keybindings_title', 'Настройка клавиш')),

  //     configReadError
  //       ? DOM(
  //           { style: 'castle-menu-error' },
  //           Lang.text('keybindings_error', 'Не удалось прочитать файл конфигурации клавиш. Проверьте путь:') + ' ' + configPath,
  //         )
  //       : DOM(
  //           {},
  //           ...Array.from({ length: 10 }, (_, i) => {
  //             const slotNum = i + 1;
  //             const slotKey = `slot${slotNum}`;
  //             const currentKey = currentBinds[slotKey] || defaultKeys[i];

  //             return DOM(
  //               { style: 'castle-menu-label keybinding-row' },
  //               DOM({ style: 'keybinding-label' }, Lang.text(`talent_slot_${slotNum}`, `Талант ${slotNum}`)),
  //               DOM({
  //                 tag: 'input',
  //                 domaudio: domAudioPresets.defaultInput,
  //                 type: 'text',
  //                 value: currentKey,
  //                 class: 'castle-keybinding-input',
  //                 maxLength: 1,
  //                 event: [
  //                   'keydown',
  //                   (e) => {
  //                     if (e.key === 'Backspace' || e.key === 'Delete') {
  //                       e.target.value = '';
  //                       currentBinds[slotKey] = '';
  //                       return;
  //                     }

  //                     if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) {
  //                       return;
  //                     }

  //                     e.preventDefault();
  //                     const key = e.key.toUpperCase();

  //                     if (/^[0-9A-Z]$/.test(key)) {
  //                       e.target.value = key;
  //                       currentBinds[slotKey] = key;
  //                       e.target.classList.add('input-success');
  //                       setTimeout(() => e.target.classList.remove('input-success'), 200);
  //                     } else {
  //                       e.target.classList.add('input-error');
  //                       setTimeout(() => e.target.classList.remove('input-error'), 200);
  //                     }
  //                   },
  //                 ],
  //               }),
  //             );
  //           }),

  //           DOM(
  //             {
  //               domaudio: domAudioPresets.bigButton,
  //               class: 'castle-menu-item-button reset-btn',
  //               event: [
  //                 'click',
  //                 () => {
  //                   document.querySelectorAll('.castle-keybinding-input').forEach((input, i) => {
  //                     input.value = defaultKeys[i];
  //                     currentBinds[`slot${i + 1}`] = defaultKeys[i];
  //                   });

  //                   const btn = document.querySelector('.reset-btn');
  //                   btn.classList.add('action-success');
  //                   btn.textContent = Lang.text('reset_complete', 'Сброшено!');
  //                   setTimeout(() => {
  //                     btn.classList.remove('action-success');
  //                     btn.textContent = Lang.text('reset_defaults', 'Сбросить на 1-0');
  //                   }, 1000);
  //                 },
  //               ],
  //             },
  //             Lang.text('reset_defaults', 'Сбросить на 1-0'),
  //           ),

  //           DOM(
  //             {
  //               domaudio: domAudioPresets.bigButton,
  //               class: 'castle-menu-item-button save-btn',
  //               event: [
  //                 'click',
  //                 async () => {
  //                   try {
  //                     let newConfig = '';
  //                     for (let i = 1; i <= 10; i++) {
  //                       const key = currentBinds[`slot${i}`] || defaultKeys[i - 1];
  //                       newConfig += `bind cmd_action_bar_slot${i} '${key}'\n`;
  //                     }

  //                     await fs.writeFile(configPath, newConfig);

  //                     const btn = document.querySelector('.save-btn');
  //                     btn.classList.add('action-success');
  //                     btn.textContent = Lang.text('saved', 'Сохранено!');
  //                     setTimeout(() => {
  //                       btn.classList.remove('action-success');
  //                       btn.textContent = Lang.text('save', 'Сохранить');
  //                     }, 1000);
  //                   } catch (e) {
  //                     console.error('Ошибка сохранения:', e);
  //                     const btn = document.querySelector('.save-btn');
  //                     btn.classList.add('action-error');
  //                     btn.textContent = Lang.text('save_error', 'Ошибка!');
  //                     setTimeout(() => {
  //                       btn.classList.remove('action-error');
  //                       btn.textContent = Lang.text('save', 'Сохранить');
  //                     }, 1000);
  //                   }
  //                 },
  //               ],
  //             },
  //             Lang.text('save', 'Сохранить'),
  //           ),
  //         ),

  //     DOM(
  //       {
  //         domaudio: domAudioPresets.bigButton,
  //         class: 'castle-menu-item-button',
  //         event: ['click', () => Window.show('settings', 'menu')],
  //       },
  //       Lang.text('back', 'Назад'),
  //     ),
  //   );
  // }

  static async support() {
    return DOM(
      { id: 'wcastle-menu' },
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('support'))),
      DOM(
        { style: 'castle-menu-items' },
        DOM({ style: 'castle-menu-text' }, Lang.text('supportDesk')),
        DOM(
          { style: 'menu-icons' },
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://vk.me/join/AZQ1dy/d2Qg98tKilOoQ1u34',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/vk.webp',
              alt: 'VK',
              style: 'support-icon',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://t.me/primeworldclassic/8232',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/telegram.webp',
              alt: 'Telegram',
              style: 'support-icon',
            }),
          ),
          DOM(
            {
              tag: 'a',
              domaudio: domAudioPresets.defaultButton,
              href: 'https://discord.gg/S3yrbFGT86',
              target: '_blank',
              event: ['click', (e) => NativeAPI.linkHandler(e)],
            },
            DOM({
              tag: 'img',
              src: 'content/icons/discord.webp',
              alt: 'Discord',
              style: 'support-icon',
            }),
          ),
        ),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'castle-menu-item-button',
            event: ['click', () => Window.show('main', 'menu')],
          },
          Lang.text('back'),
        ),
      ),
    );
  }
  
  static async mmSearchSettings() {
    let mmEnabled = true;
    let mmtestEnabled = true;
    let mmRatingChangesEnabled = true;
    
    try {
      const [mmState, mmtestState, mmRatingChangesState] = await Promise.all([
        App.api.request('mm', 'getSearchAvailability'),
        App.api.request('mmtest', 'getSearchAvailability'),
        App.api.request('mm', 'getRatingChangesAvailability'),
      ]);
      mmEnabled = Boolean(mmState?.enabled);
      mmtestEnabled = Boolean(mmtestState?.enabled);
      mmRatingChangesEnabled = Boolean(mmRatingChangesState?.enabled);
    } catch (error) {
      App.error(error);
    }
    
    const updateFlag = async (target, checked, input) => {
      try {
        const response = await App.api.request(target, 'setSearchAvailability', { enabled: checked });
        input.checked = Boolean(response?.enabled);
      } catch (error) {
        input.checked = !checked;
        App.error(error);
      }
    };
    
    const mmToggle = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultSelect,
      type: 'checkbox',
      id: 'mm-search-enabled',
      checked: mmEnabled,
      event: [
        'change',
        (e) => updateFlag('mm', e.target.checked, e.target),
      ],
    });
    
    const mmtestToggle = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultSelect,
      type: 'checkbox',
      id: 'mmtest-search-enabled',
      checked: mmtestEnabled,
      event: [
        'change',
        (e) => updateFlag('mmtest', e.target.checked, e.target),
      ],
    });
    
    const mmRatingChangesToggle = DOM({
      tag: 'input',
      domaudio: domAudioPresets.defaultSelect,
      type: 'checkbox',
      id: 'mm-rating-changes-enabled',
      checked: mmRatingChangesEnabled,
      event: [
        'change',
        async (e) => {
          try {
            const response = await App.api.request('mm', 'setRatingChangesAvailability', { enabled: e.target.checked });
            e.target.checked = Boolean(response?.enabled);
          } catch (error) {
            e.target.checked = !e.target.checked;
            App.error(error);
          }
        },
      ],
    });
    
    return DOM(
      { id: 'wcastle-menu' },
      DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, 'Настройка поиска боя')),
      DOM(
        { style: 'castle-menu-items' },
        DOM({ style: 'castle-menu-item-checkbox' }, mmToggle, DOM({ tag: 'label', for: 'mm-search-enabled' }, 'Включить поиск боя (MM)')),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          mmtestToggle,
          DOM({ tag: 'label', for: 'mmtest-search-enabled' }, 'Включить поиск боя (MMTEST)'),
        ),
        DOM(
          { style: 'castle-menu-item-checkbox' },
          mmRatingChangesToggle,
          DOM({ tag: 'label', for: 'mm-rating-changes-enabled' }, 'Изменять рейтинг после обычных матчей (MM)'),
        ),
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'castle-menu-item-button',
            event: ['click', () => Window.show('main', 'adminPanel')],
          },
          Lang.text('back'),
        ),
      ),
    );
  }
  
  static async adminPanel() {
    return DOM(
      { id: 'wcastle-menu' },
      DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, 'Админ Панель')),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              Window.show('main', 'mmSearchSettings');
            },
          ],
        },
        'Поиск боя',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              View.show('talents'); // Логика для отображения обычных талантов
            },
          ],
        },
        'Таланты (обычные)',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              View.show('talents2'); // Логика для отображения классовых талантов
            },
          ],
        },
        'Таланты (классовые)',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              View.show('users'); // Логика для управления пользователями
            },
          ],
        },
        'Пользователи',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              Window.show('main', 'castleDebug'); // Логика для управления пользователями
            },
          ],
        },
        'Замок дебаг',
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: ['click', () => Window.show('main', 'menu')],
        },
        Lang.text('back'),
      ),
    );
  }
  static async castleDebug() {
    let pattern = DOM({ tag: 'input' });
    let flags = DOM({ tag: 'input' });
    pattern.addEventListener('input', () => {
      Castle.updateFilter(pattern.value, flags.value);
    });
    flags.addEventListener('input', () => {
      Castle.updateFilter(pattern.value, flags.value);
    });
    return DOM(
      { id: 'wcastle-render-debug' },
      DOM({ style: 'castle-menu-label' }, 'Поиск построек по JS RegExp'),
      DOM({ style: 'castle-menu-label' }, 'Паттерн ', pattern),
      DOM({ style: 'castle-menu-label' }, 'Флаги ', flags),
    );
  }
  static async accountPanel() {
    return DOM({ id: 'wcastle-menu' }, DOM({style: 'title-modal'}, DOM({style: 'title-modal-text'}, Lang.text('account')),),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              ParentEvent.children = window.open(
                `https://api2.26rus-game.ru:2087/connect/${App.storage.data.token}`,
                `SteamAuth`,
                'width=1280, height=720, top=' +
                  (screen.height - 720) / 2 +
                  ', left=' +
                  (screen.width - 1280) / 2 +
                  ', toolbar=no, menubar=no, location=no, scrollbars=no, resizable=no, status=no',
              );
            },
          ],
        },
        Lang.text('steamConnect'),
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              App.setNickname();
            },
          ],
        },
        Lang.text('nicknameChange'),
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: [
            'click',
            () => {
              App.setFraction();
            },
          ],
        },
        Lang.text('sideChange'),
      ),
      DOM(
        {
          domaudio: domAudioPresets.bigButton,
          style: 'castle-menu-item-button',
          event: ['click', () => Window.show('main', 'menu')],
        },
        Lang.text('back'),
      ),
    );
  }

  static async callWindow() {
    const data = Window.callData;

    if (!data) {
      return DOM({ id: 'wcastle-call' });
    }

    let displayName = String(data?.name || data?.nickname || `id${Number(data?.id) || '?'}`);
    if (displayName.length > 13) {
      displayName = displayName.substring(0, 11) + '...';
    }

    const callTimeout = setTimeout(() => {
      Sound.stop('ui-call');

      if (Window.windows['main'] && Window.windows['main'].id === 'wcastle-call') {
        App.api.request('user', 'callTimeout', { id: data.id }).catch(console.error);
        Window.close('main');
      }

      Window.callData = null;
      Window.callTimeout = null;
    }, 15000);

    Window.callTimeout = callTimeout;

    return DOM(
      { id: 'wcastle-call' },
      DOM({style: 'title-modal'},
        DOM({style: 'title-modal-text'}, 'Звонок'),
      ),
      DOM({ style: 'castle-menu-title' }, Lang.text('friendCallFrom').replace('{name}', displayName)),
      DOM(
        { style: 'castle-menu-items-modal' },
        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'splash-content-button-modal',
            event: [
              'click',
              async () => {
                Sound.stop('ui-call');
                try {
                  let voice = new Voice(data.id, String(data?.key || ''), data.name, true);
                  await voice.accept(data.offer);
                  Window.callData = null;
                  Window.close('main');
                } catch (error) {
                  App.error(error);
                  Window.callData = null;
                }
              },
            ],
          },
          Lang.text('friendAccept'),
        ),

        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'splash-content-button-modal',
            id: 'splash-content-button-modal-red',
            event: [
              'click',
              async () => {
                Sound.stop('ui-call');
                Window.callData = null;
                Window.close('main');
              },
            ],
          },
          Lang.text('friendDropCall'),
        ),
      ),
    );
  }

  static async inviteWindow() {
    const data = Window.inviteData;

    Sound.play(SOUNDS_LIBRARY.GROUP_INVITE, {
      id: 'ui-groupInvite',
      volume: Castle.GetVolume(Castle.AUDIO_SOUNDS) * 1.2,
    });

    if (!data) {
      console.warn('Нет данных для окна приглашения');
      return DOM({ id: 'wcastle-invite' });
    }

    let displayNickname = data.nickname;
    if (displayNickname.length > 13) {
      displayNickname = displayNickname.substring(0, 11) + '...';
    }

    const inviteTimeout = setTimeout(() => {
      console.log('Таймаут 15 секунд, приглашение автоматически отменяется');

      if (Window.windows['main'] && Window.windows['main'].id === 'wcastle-invite') {
        Window.close('main');
      }

      Window.inviteData = null;
      Window.inviteTimeout = null;
    }, 15000);

    Window.inviteTimeout = inviteTimeout;

    return DOM(
      { id: 'wcastle-invite' }, DOM({style: 'title-modal'},DOM({style: 'title-modal-text'}, Lang.text('battleText')),),
      DOM({ style: 'castle-menu-title' }, Lang.text('friendInvitesToLobby').replace('{nickname}', displayNickname)),
      DOM(
        { style: 'castle-menu-items-modal' },
        DOM(
          {
            style: 'splash-content-button-modal',
            domaudio: domAudioPresets.bigButton,
            event: [
              'click',
              async () => {
                if (Window.inviteTimeout) {
                  clearTimeout(Window.inviteTimeout);
                  Window.inviteTimeout = null;
                }

                try {
                  await App.api.request(App.CURRENT_MM, 'joinParty', {
                    code: data.code,
                    version: App.PW_VERSION,
                  });
                  Window.inviteData = null;
                  Window.close('main');
                } catch (error) {
                  App.error(error);
                  Window.inviteData = null;
                }
              },
            ],
          },
          Lang.text('friendAccept'),
        ),

        DOM(
          {
            domaudio: domAudioPresets.bigButton,
            style: 'splash-content-button-modal',
            id: 'splash-content-button-modal-red',
            event: [
              'click',
              () => {
                if (Window.inviteTimeout) {
                  clearTimeout(Window.inviteTimeout);
                  Window.inviteTimeout = null;
                }
                Window.inviteData = null;
                Window.close('main');
              },
            ],
          },
          Lang.text('friendCancle'),
        ),
      ),
    );
  }
  
  static updateSliderFill(slider) {
	const value = slider.value;
	const max = slider.max;
	const percentage = 2 + (value / max * 98);
	console.log(value, max);
	slider.style.setProperty('--fill-percentage', percentage + '%');
  }
}
Window.keybindings = keybindings;
