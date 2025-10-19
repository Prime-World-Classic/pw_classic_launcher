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

export class Window {
	static windows = {}
	static windowOrder = []
	static async show(category, method, value, value2, value3) {
		if (!(method in Window)) {
			return;
		}
		let template = await Window[method](value, value2, value3);
		let closeButton = DOM({
			style: 'close-button',
			title: Lang.text('titleClose'),
			event: ['click', () => {
				Window.close(category);
			}]
		},
			DOM({ tag: 'img', src: 'content/icons/close-cropped.svg', alt: Lang.text('titleClose'), style: 'close-image-style' }));
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
		if (category in Window.windows) {
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
            return this.close(lastCategory);
        }
        return false;
    }
	 static anyOpen() {
        return Window.windowOrder.length > 0;
    }
	static async steamauth() {
		return DOM({ id: 'wsteamauth' },
			DOM({ style: 'castle-menu-title' }, Lang.text('steamauthTitle')),
			DOM({ style: 'castle-menu-items' },
				DOM({ style: 'castle-menu-text' }, Lang.text('steamauth')),
				DOM({
					style: 'castle-menu-item-button', event: ['click', () => {

						ParentEvent.children = window.open('https://api2.26rus-game.ru:2087', 'SteamAuth', 'width=1280, height=720, top=' + ((screen.height - 720) / 2) + ', left=' + ((screen.width - 1280) / 2) + ', toolbar=no, menubar=no, location=no, scrollbars=no, resizable=no, status=no');

					}]
				}, Lang.text("continue"))
			)
		);
	}
	static async build(heroId, targetId = 0, isWindow = false) {
		let viewBuild = await View.build(heroId, targetId, isWindow);
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
	static async history() {
		let view = await View.history(true);
		return DOM({ id: 'whistory' }, view);
	}
	static async inventory() {
		let view = await View.inventory(true);
		return DOM({ id: 'winventory' }, view);
	}
	/*
	static async quest(questId,cloneNode,test) {
		let view = await View.quest(questId,cloneNode,test);
		
	}
	*/
	static async menu() {
		return DOM({ id: 'wcastle-menu' },
			DOM({ style: 'castle-menu-title' }, Lang.text('menu')),
			DOM({ style: 'castle-menu-items' },
				App.isAdmin() ? DOM({ style: 'castle-menu-item-button' },
					DOM({ event: ['click', () => Window.show('main', 'adminPanel')] }, 'Админ')) : DOM(),
				DOM({ style: 'castle-menu-item-button' },
					DOM({ event: ['click', () => Window.show('main', 'accountPanel')] }, Lang.text('account'))),
				DOM({ style: 'castle-menu-item-button' },
					DOM({ event: ['click', () => Window.show('main', 'settings')] }, Lang.text('preferences'))),
				DOM({ style: 'castle-menu-item-button' },
					DOM({ event: ['click', () => Window.show('main', 'support')] }, Lang.text('support'))),
				DOM({
					style: 'castle-menu-item-button', event: ['click', async () => {
						App.exit();
						Splash.hide();
					}]
				}, Lang.text('accountSwitch')),
				DOM({
					style: 'castle-menu-item-button', event: ['click', () => {
						if (NativeAPI.status) {
							NativeAPI.exit();
						}
					}]
				}, Lang.text('exit')),
				DOM({ style: 'castle-menu-label' }, `${Lang.text('version')}: v.${App.PW_VERSION}`),
				DOM({ style: 'menu-icons' },
					DOM({ tag: 'a', href: 'https://vk.com/primeworldclassic', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
						DOM({ tag: 'img', src: 'content/icons/vk.webp', alt: 'VK', style: 'menu-icons' })
					),
					DOM({ tag: 'a', href: 'https://t.me/primeworldclassic', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
						DOM({ tag: 'img', src: 'content/icons/telegram.webp', alt: 'Telegram', style: 'menu-icons' })
					),
					DOM({ tag: 'a', href: 'https://discord.gg/MueeP3aAzh', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
						DOM({ tag: 'img', src: 'content/icons/discord.webp', alt: 'Discord', style: 'menu-icons' })
					),
					DOM({ tag: 'a', href: 'https://store.steampowered.com/app/3684820/Prime_World_Classic', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
						DOM({ tag: 'img', src: 'content/icons/steam2.webp', alt: 'Steam', style: 'menu-icons' })
					)
				)
			)
		)
	}

	static async settings() {
		let soundTestId = 'sound_test';

		return DOM({ id: 'wcastle-menu' },
			DOM({ style: 'castle-menu-title' }, Lang.text('preferences')),
			DOM({ style: 'castle-menu-items' },
				DOM({ style: 'castle-menu-item-checkbox' },
					DOM({
						tag: 'input', type: 'checkbox', id: 'fullscreen-toggle', checked: !Settings.settings.fullscreen, event: ['change', (e) => {
							Settings.settings.fullscreen = !e.target.checked;
							Settings.ApplySettings({ render: false, audio: false });
						}]
					},
						{ checked: Settings.settings.fullscreen }),
					DOM({ tag: 'label', for: 'fullscreen-toggle' }, Lang.text('windowMode') + ' (F11)')
				),
				DOM({ style: 'castle-menu-item-checkbox' },
					DOM({
						tag: 'input',
						type: 'checkbox',
						id: 'render-toggle',
						checked: Settings.settings.render,
						event: ['change', (e) => {
							Settings.settings.render = e.target.checked;
							Settings.ApplySettings({ audio: false, window: false });
						}]
					}),
					DOM({ tag: 'label', for: 'render-toggle' }, Lang.text('threeD'))
				),
				DOM({ style: 'castle-menu-item-checkbox' },
					DOM({
						tag: 'input', type: 'checkbox', id: 'radmin-priority', checked: Settings.settings.radminPriority, event: ['change', (e) => {
							Settings.settings.radminPriority = e.target.checked;
						}]
					},
						{ checked: Settings.settings.radminPriority }),
					DOM({ tag: 'label', for: 'radmin-priority' }, Lang.text('radminPriority'))
				),
				DOM({ style: 'castle-menu-item-checkbox' },
					DOM({
						tag: 'input', type: 'checkbox', id: 'novoice', checked: Settings.settings.novoice, event: ['change', (e) => {
							Settings.settings.novoice = e.target.checked;
						}]
					},
						{ checked: Settings.settings.novoice }),
					DOM({ tag: 'label', for: 'novoice' }, Lang.text('voiceEnabled'))
				),
				DOM({ style: 'castle-menu-label' }, Lang.text('volume'),
					DOM({
						tag: 'input',
						type: 'range',
						value: Settings.settings.globalVolume * 100,
						min: '0',
						max: '100',
						step: '1',
						style: 'castle-menu-slider',
						event: ['input', (e) => {
							Settings.settings.globalVolume = parseFloat(e.target.value) / 100;
							Settings.ApplySettings({ render: false, window: false });


							document.getElementById('global-volume-percentage').textContent =
								`${Math.round(Settings.settings.globalVolume * 100)}%`;
						}]
					}),
					DOM({
						tag: 'span',
						id: 'global-volume-percentage',
						style: 'volume-percentage'
					}, `${Math.round(Settings.settings.globalVolume * 100)}%`)
				),
				DOM({ style: 'castle-menu-label' }, Lang.text('volumeMusic'),
					DOM({
						tag: 'input',
						type: 'range',
						value: Settings.settings.musicVolume * 100,
						min: '0',
						max: '100',
						step: '1',
						style: 'castle-menu-slider',
						event: ['input', (e) => {
							Settings.settings.musicVolume = parseFloat(e.target.value) / 100;
							Settings.ApplySettings({ render: false, window: false });

							document.getElementById('music-volume-percentage').textContent =
								`${Math.round(Settings.settings.musicVolume * 100)}%`;
						}]
					}),
					DOM({
						tag: 'span',
						id: 'music-volume-percentage',
						style: 'volume-percentage'
					}, `${Math.round(Settings.settings.musicVolume * 100)}%`)
				),
				DOM({ style: 'castle-menu-label' }, Lang.text('volumeSound'),
					DOM({
						tag: 'input',
						type: 'range',
						value: Settings.settings.soundsVolume * 100,
						min: '0',
						max: '100',
						step: '1',
						style: 'castle-menu-slider',
						event: ['input', (e) => {
							Settings.settings.soundsVolume = parseFloat(e.target.value) / 100;
							Settings.ApplySettings({ render: false, window: false });

							if (!Castle.testSoundIsPlaying) {
								Castle.testSoundIsPlaying = true;
								Sound.play('content/sounds/found.ogg', {
									id: soundTestId,
									volume: Castle.GetVolume(Castle.AUDIO_SOUNDS)
								}, () => {
									Castle.testSoundIsPlaying = false
								});
							}

							document.getElementById('sounds-volume-percentage').textContent =
								`${Math.round(Settings.settings.soundsVolume * 100)}%`;
						}]
					}),
					DOM({
						tag: 'span',
						id: 'sounds-volume-percentage',
						style: 'volume-percentage'
					}, `${Math.round(Settings.settings.soundsVolume * 100)}%`)
				),
				DOM({
					style: 'castle-menu-item-button',
					event: ['click', async (e) => {
						const oldLanguage = Lang.target;
						Lang.toggle();
						Settings.settings.language = Lang.target;
						App.error(`${Lang.text('LangTarg')}: ${Lang.list[oldLanguage].name} → ${Lang.list[Lang.target].name}`);
						await Lang.reinitViews();
						await Window.show('main', 'settings');
					}]
				}, `${Lang.text('language')} (${Lang.target})`
				),
				// Добавленная кнопка "Клавиши"
				/*DOM({ 
					style: 'castle-menu-item-button',
					event: ['click', () => {
						console.log("Клавиши clicked"); // Для отладки
						Window.show('main','keybindings'); 
					}]
				}, Lang.text('keys') || 'Клавиши'), // Fallback на текст, если перевод отсутствует
				*/
				// Кнопка "Назад"
				DOM({
					style: 'castle-menu-item-button',
					event: ['click', () => {
						Window.show('main', 'menu');
					}]
				}, Lang.text('back'))
				/*,
				
				DOM({ style: 'castle-menu-label-description' }, Lang.text('soundHelp'))
				*/
			)
		);
	}

	static async keybindings() {
		async function findConfigFile() {
			const possiblePaths = [
				`${nw.App.getDataPath('documents')}/My Games/Prime World Classic/input_new.cfg`,
				`${process.env.USERPROFILE}/Documents/My Games/Prime World Classic/input_new.cfg`,
				`${process.env.USERPROFILE}/OneDrive/Documents/My Games/Prime World Classic/input_new.cfg`
			];

			for (const path of possiblePaths) {
				try {
					await fs.access(path);
					return path;
				} catch (e) {
					continue;
				}
			}
			return null;
		}

		const configPath = await findConfigFile();

		if (!configPath) {
			console.error("Не удалось найти файл конфигурации ни по одному из путей");
			return DOM({ id: 'wcastle-keybindings' },
				DOM({ style: 'castle-menu-error' },
					Lang.text('keybindings_error', 'Не удалось найти файл конфигурации клавиш')
				),
				DOM({
					class: 'castle-menu-item-button',
					event: ['click', () => Window.show('settings', 'menu')]
				}, Lang.text('back', 'Назад'))
			);
		}

		const defaultKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

		let currentBinds = {};
		let configReadError = false;

		try {
			const configContent = await fs.readFile(configPath, 'utf-8');
			const bindRegex = /bind cmd_action_bar_slot(\d+) '(.+?)'/g;
			let match;

			while ((match = bindRegex.exec(configContent)) !== null) {
				currentBinds[`slot${match[1]}`] = match[2];
			}
		} catch (e) {
			console.error("Ошибка чтения конфига:", e);
			configReadError = true;
		}

		return DOM({ id: 'wcastle-keybindings' },
			DOM({ style: 'castle-menu-title' }, Lang.text('keybindings_title', 'Настройка клавиш')),

			configReadError
				? DOM({ style: 'castle-menu-error' },
					Lang.text('keybindings_error', 'Не удалось прочитать файл конфигурации клавиш. Проверьте путь:') + ' ' + configPath
				)
				: DOM({},
					...Array.from({ length: 10 }, (_, i) => {
						const slotNum = i + 1;
						const slotKey = `slot${slotNum}`;
						const currentKey = currentBinds[slotKey] || defaultKeys[i];

						return DOM({ style: 'castle-menu-label keybinding-row' },
							DOM({ style: 'keybinding-label' },
								Lang.text(`talent_slot_${slotNum}`, `Талант ${slotNum}`)
							),
							DOM({
								tag: 'input',
								type: 'text',
								value: currentKey,
								class: 'castle-keybinding-input',
								maxLength: 1,
								event: [
									'keydown',
									(e) => {
										if (e.key === 'Backspace' || e.key === 'Delete') {
											e.target.value = '';
											currentBinds[slotKey] = '';
											return;
										}

										if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) {
											return;
										}

										e.preventDefault();
										const key = e.key.toUpperCase();

										if (/^[0-9A-Z]$/.test(key)) {
											e.target.value = key;
											currentBinds[slotKey] = key;
											e.target.classList.add('input-success');
											setTimeout(() => e.target.classList.remove('input-success'), 200);
										} else {
											e.target.classList.add('input-error');
											setTimeout(() => e.target.classList.remove('input-error'), 200);
										}
									}
								]
							})
						);
					}),

					DOM({
						class: 'castle-menu-item-button reset-btn',
						event: ['click', () => {
							document.querySelectorAll('.castle-keybinding-input').forEach((input, i) => {
								input.value = defaultKeys[i];
								currentBinds[`slot${i + 1}`] = defaultKeys[i];
							});

							const btn = document.querySelector('.reset-btn');
							btn.classList.add('action-success');
							btn.textContent = Lang.text('reset_complete', 'Сброшено!');
							setTimeout(() => {
								btn.classList.remove('action-success');
								btn.textContent = Lang.text('reset_defaults', 'Сбросить на 1-0');
							}, 1000);
						}]
					}, Lang.text('reset_defaults', 'Сбросить на 1-0')),

					DOM({
						class: 'castle-menu-item-button save-btn',
						event: ['click', async () => {
							try {
								let newConfig = '';
								for (let i = 1; i <= 10; i++) {
									const key = currentBinds[`slot${i}`] || defaultKeys[i - 1];
									newConfig += `bind cmd_action_bar_slot${i} '${key}'\n`;
								}

								await fs.writeFile(configPath, newConfig);

								const btn = document.querySelector('.save-btn');
								btn.classList.add('action-success');
								btn.textContent = Lang.text('saved', 'Сохранено!');
								setTimeout(() => {
									btn.classList.remove('action-success');
									btn.textContent = Lang.text('save', 'Сохранить');
								}, 1000);

							} catch (e) {
								console.error("Ошибка сохранения:", e);
								const btn = document.querySelector('.save-btn');
								btn.classList.add('action-error');
								btn.textContent = Lang.text('save_error', 'Ошибка!');
								setTimeout(() => {
									btn.classList.remove('action-error');
									btn.textContent = Lang.text('save', 'Сохранить');
								}, 1000);
							}
						}]
					}, Lang.text('save', 'Сохранить'))
				),

			DOM({
				class: 'castle-menu-item-button',
				event: ['click', () => Window.show('settings', 'menu')]
			}, Lang.text('back', 'Назад'))
		);
	}

	static async support() {
		return DOM({ id: 'wcastle-menu' },
			DOM({ style: 'castle-menu-title' }, Lang.text('support')),
			DOM({ style: 'castle-menu-items' },
				DOM({ style: 'castle-menu-text' }, Lang.text('supportDesk')),
				DOM({ style: 'menu-icons' },
					DOM({ tag: 'a', href: 'https://vk.me/join/AZQ1dy/d2Qg98tKilOoQ1u34', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
						DOM({ tag: 'img', src: 'content/icons/vk.webp', alt: 'VK', style: 'support-icon' })
					),
					DOM({ tag: 'a', href: 'https://t.me/primeworldclassic/8232', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
						DOM({ tag: 'img', src: 'content/icons/telegram.webp', alt: 'Telegram', style: 'support-icon' })
					),
					DOM({ tag: 'a', href: 'https://discord.gg/S3yrbFGT86', target: '_blank', event: ['click', (e) => NativeAPI.linkHandler(e)] },
						DOM({ tag: 'img', src: 'content/icons/discord.webp', alt: 'Discord', style: 'support-icon' })
					)
				),
				DOM({ style: 'castle-menu-item-button', event: ['click', () => Window.show('main', 'menu')] }, Lang.text('back'))
			)
		);
	}
	static async adminPanel() {
		return DOM({ id: 'wcastle-menu' },
			DOM({ style: 'castle-menu-title' }, 'Админ Панель'),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					View.show('talents'); // Логика для отображения обычных талантов
				}]
			}, 'Таланты (обычные)'),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					View.show('talents2'); // Логика для отображения классовых талантов
				}]
			}, 'Таланты (классовые)'),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					View.show('users'); // Логика для управления пользователями
				}]
			}, 'Пользователи'),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					Window.show('main', 'castleDebug'); // Логика для управления пользователями
				}]
			}, 'Замок дебаг'),
			DOM({ style: 'castle-menu-item-button', event: ['click', () => Window.show('main', 'menu')] }, Lang.text('back'))
		);
	}
	static async castleDebug() {
		let pattern = DOM({tag: 'input'});
		let flags = DOM({tag: 'input'});
		pattern.addEventListener('input', () => { Castle.updateFilter(pattern.value, flags.value) });
		flags.addEventListener('input', () => { Castle.updateFilter(pattern.value, flags.value) });
		return DOM( { id: 'wcastle-render-debug' },
			DOM({ style: 'castle-menu-label' }, "Поиск построек по JS RegExp"),
			DOM({ style: 'castle-menu-label' }, 'Паттерн ', pattern), 
			DOM({ style: 'castle-menu-label' }, 'Флаги ', flags)
		);
	}
	static async accountPanel() {
		return DOM({ id: 'wcastle-menu' },
			DOM({ style: 'castle-menu-title' }, Lang.text('account')),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					ParentEvent.children = window.open(
						`https://api2.26rus-game.ru:2087/connect/${App.storage.data.token}`,
						`SteamAuth`,
						'width=1280, height=720, top=' + ((screen.height - 720) / 2) + ', left=' + ((screen.width - 1280) / 2) + ', toolbar=no, menubar=no, location=no, scrollbars=no, resizable=no, status=no'
					);
				}]
			}, Lang.text('steamConnect')),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					App.setNickname();
				}]
			}, Lang.text('nicknameChange')),
			DOM({
				style: 'castle-menu-item-button', event: ['click', () => {
					App.setFraction();
				}]
			}, Lang.text('sideChange')),
			DOM({ style: 'castle-menu-item-button', event: ['click', () => Window.show('main', 'menu')] }, Lang.text('back'))
		);
	}


}