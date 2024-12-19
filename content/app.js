APP_VERSION = '3 (TEST)';

PW_VERSION = '2.0.0';

window.addEventListener('DOMContentLoaded',() => {
	
	Splash.init();
	
	NativeAPI.init();
	
	NativeAPI.update((data) => {
		
		let progress = false;
		
		if(data.update){
			
			if(!progress){
				
				progress = View.progress();
				
				progress.firstChild.style.width = data.total+'%';
				
				progress.lastChild.innerText = `${data.title} ${data.total}%...`;
				
			}
			
		}
		else{
			
			if(progress){
				
				Splash.hide();
				
			}
			
		}
		
	});
	
	App.init();
	
});

class DataBase {
	
	constructor(name,structure,version = 1){
		
		if( !('indexedDB' in window) ){
			
			throw 'Отсутствует поддержка IndexedDB!';
			
		}
		
		this.name = name;
		
		this.structure = structure;
		
		this.version = version;
		
	}
	
	async init(){
		
		let request = indexedDB.open(this.name,this.version);
		
		request.addEventListener('upgradeneeded',async (event) => await this.upgrade(event));
		
		return new Promise( (resolve,reject) => {
			
			request.addEventListener('success',event => {
				
				this.link = event.target.result;
				
				resolve();
				
			});
			
			request.addEventListener('error',reject);
			
		});
		
	}
	
	async add(name,value,key){
		
		let transaction,table,result;
		
		transaction = this.link.transaction(name,'readwrite');
		
		table = transaction.objectStore(name);
		
		result = table.put(value,key);
		
		return new Promise((resolve,reject) => {
			
			result.addEventListener('success',event => {
				
				resolve(event.target.result);
				
			});
			
			//transaction.addEventListener('complete',resolve);
			
			transaction.addEventListener('error',reject);
			
		});
		
	}
	
	async get(name,key){
		
		let transaction,table,result;
		
		transaction = this.link.transaction(name,'readonly');
		
		table = transaction.objectStore(name);
		
		result = table.get(key);
		
		return await new Promise((resolve,reject) => {
			
			result.addEventListener('success',event => {
				
				resolve(event.target.result);
				
			});
			
			result.addEventListener('error',reject);
			
		});
		
	}
	
	async getAll(name,key){
		
		let transaction,table,result;
		
		transaction = this.link.transaction(name,'readonly');
		
		table = transaction.objectStore(name);
	
		result = table.getAll(key);
		
		return new Promise((resolve,reject) => {
			
			result.addEventListener('success',event => {
				
				resolve(event.target.result);
				
			});
			
			result.addEventListener('error',reject);
			
		});
		
	}
	
	async getIndexAllSync(name,nameIndex,nameKey,callback){
		
		let transaction,table,index,result;
		
		transaction = this.link.transaction(name,'readonly');
		
		table = transaction.objectStore(name);
		
		index = table.index(nameIndex);
		
		result = index.getAll(nameKey);
		
		result.addEventListener('success',event => {
			
			callback(event.target.result);
			
		});
			
		result.addEventListener('error',(error) => {
			
			throw error;
			
		});
		
		// нужно работать с курсором для экономии памяти!!!, иначе при большом количестве информации её будет невозможно вытащить... будет ошибка при попытке получения большого массива
		//let request = books.openCursor(); // курсору нужно передать инфу о количестве штук, как я понимаю, по умолчанию он по 1 записи выдает
		// вызывается для каждой найденной курсором книги
		//request.onsuccess = function() {
			
			//let cursor = request.result;
			
			//if (cursor) {
				
				//let key = cursor.key; // ключ книги (поле id)
				
				//let value = cursor.value; // объект книги
				
				//console.log(key, value);
				
				//cursor.continue();
				
				//} else {
					
					//console.log("Книг больше нет");
					
					//}};
					
	}
	
	async getIndexAll(name,nameIndex,nameKey){
		
		let transaction,table,index,result;
		
		transaction = this.link.transaction(name,'readonly');
		
		table = transaction.objectStore(name);
		
		index = table.index(nameIndex);
		
		result = index.getAll(nameKey);		
		
		return new Promise((resolve,reject) => {
			
			result.addEventListener('success',event => {
				
				resolve(event.target.result);
				
			});
			
			result.addEventListener('error',reject);
			
		});
		
	}
	
	async multi(object){
		
		let requests = new Array();
		
		for(let table in object){
			
			switch(object[table].method){
				
				case 'get': requests.push(this.get(table,object[table].id)); break;
				
				case 'getIndexAll': requests.push(this.getIndexAll(table,object[table].key,object[table].id)); break;
				
				default: throw `Неизвестный метод ${object[table].method}`; break;
				
			}
			
		}
		
		let i = 0, result = await Promise.all(requests);
		
		for(let table in object){
			
			object[table] = result[i];
			
			i++;
			
		}
		
		return object;
		
	}
	
	async deleteIndexAll(name,nameIndex,nameKey){

        let keys = await this.getIndexAll(name,nameIndex,nameKey);
		
		if(!keys){
			
			return;
			
		}
		
		for(let item of keys){
			
			await this.delete(name,'id');
			
		}
		
		return true;
		
	}
	
	async delete (name,key){
		
		let transaction,table,result;
		
		transaction = this.link.transaction(name,'readwrite');
		
		table = transaction.objectStore(name);
		
		result = table.delete(key);
		
		return new Promise((resolve,reject) => {
			
			result.addEventListener('success',event => {
				
				resolve(event);
				
			});
			
			result.addEventListener('error',reject);
			
		});
		
	}
	
	async clear(name){
		
		let transaction = this.link.transaction(name,'readwrite');
		
		return transaction.objectStore(name).clear();
		
	}
	
	async upgrade(event){
		
		let db = event.target.result;
		
		if(!this.structure){
			
			throw `Для создания базы-данных, необходима разметка структуры`;
			
		}
		
		let objectStore, table, index;
		
		for(objectStore of this.structure){
			
			let find = false;
			
			try{
				
				for(let value of db.objectStoreNames){ // DOMStringList метод contains нельзя использовать, устарело.
					
					if(value == objectStore.name){
						
						find = true;
						
						break;
						
					}
					
				}
				
				if(find){
					
					if('clear' in objectStore){
						
						db.deleteObjectStore(objectStore.name);
						
					}
					else{
						
						continue;
						
					}
					
				}
				
				table = db.createObjectStore(objectStore.name,objectStore.options);
				
				if(objectStore.indexes){
					
					for(index of objectStore.indexes){
						
						table.createIndex(index.name,index.path);
						
					}
					
				}
				
			}
			catch(e){
				
				console.log(`Ошибочка, которую мы скрыли: ${e} :ибо как проверить на наличие таблицы? ;>`);
				
			}
			
		}
		
	}
	
}

class Store {
	
	static async init(){
		
		Store.db = new DataBase('Storage',[{name:'keys',options:{keyPath:'identify'},indexes:[{name:'objects',path:'object'}]}],5);
		
		return await Store.db.init();
		
	}
	
	static async get(object,key){
		
		let result = await Store.db.get('keys',`${object}.${key}`);
		
		return (result) ? result.value : false;
		
	}
	
	static async getAll(object){
		
		let keys = await Store.db.getIndexAll('keys','objects',object);
		
		if(!keys.length){
			
			return keys;
			
		}
		
		let result = new Object();
		
		for(let item of keys){
			
			result[item.key] = item.value;
			
		}
		
		return result;
		
	}
	
	constructor(object){
		
		this.object = object;
		
		this.local = new Object();
		
	}
	
	async init(defaultObject){
		
		let result,object;
		
		result = await Store.db.getIndexAll('keys','objects',this.object);
		
		if(result.length){
			
			for(object of result){
				
				this.local[object.key] = object.value;
				
			}
			
		}
		else{
			
			await this.set(defaultObject);
			
		}
		
	}
	
	get data(){
		
		return this.local;
		
	}
	
	async set(object){
		
		for(let key in object){
			
			await Store.db.add('keys',{identify:`${this.object}.${key}`,object:this.object,key:key,value:object[key]});
			
			this.local[key] = object[key]; 
			
		}
		
	}
	
	async getAll(object){
		
		let keys = await Store.db.getIndexAll('keys','objects',object);
		
		if(!keys.length){
			
			return false;
			
		}
		
		let result = new Object();
		
		for(let item of keys){
			
			result[item.key] = item.value;
			
		}
		
		return result;
		
	}
	
	static async delete(object){
		
		let keys = await Store.db.getIndexAll('keys','objects',object);
		
		if(!keys){
			
			return;
			
		}
		
		for(let item of keys){
			
			await Store.db.delete('keys',item.identify);
			
		}
		
	}
	
}

class Api {
	
	constructor(host, events){
		
		if( !('WebSocket' in window) ){
			
			throw 'Ваш браузер не поддерживает WebSocket!';
			
		}
		
		this.host = host;
		
		this.MAIN_HOST = ( Array.isArray(this.host) ? this.host[0] : this.host );
		
		this.CONNECTION_FALLED = 0;
		
		this.CONNECTION_FALLED_TIME = Date.now();
		
		this.awaiting = new Object();
		
		this.events = (events) ? events : new Object();
		
	}
	
	async init(){
		
		try{
			
			await this.connect();
			
		}
		catch(e){
			
			
			
		}
		
	}
	
	async connect(){
		
		this.WebSocket = new WebSocket(`${this.MAIN_HOST}`); // + ${App.storage.data.token}		
		
		this.WebSocket.addEventListener('message', (event) => this.message(event.data) );
		
		this.WebSocket.addEventListener('close', async () => {
			console.log(`Разрыв соединения API (${this.MAIN_HOST})`);
			if( ( Date.now() - this.CONNECTION_FALLED_TIME ) < 15000){
				
				this.CONNECTION_FALLED++;
				
				this.CONNECTION_FALLED_TIME = Date.now();
				
			}
			
			if( (this.CONNECTION_FALLED >= 3) && (Array.isArray(this.host)) ){
				
				if( ( this.host.indexOf(this.MAIN_HOST) + 1 ) <= (this.host.length - 1) ){
					
					this.MAIN_HOST = this.host[( this.host.indexOf(this.MAIN_HOST) + 1 )];
					
				}
				else{
					
					this.MAIN_HOST = this.host[0];
					
				}
				console.log(`Переподключаем API (${this.MAIN_HOST})`);
				this.CONNECTION_FALLED = 0;
				
				this.CONNECTION_FALLED_TIME = Date.now();
				
			}
			
			try{
				
				await this.connect();
				
			}
			catch(e){
				
				// разрыв соединения
				
			}
			
		});
		
		return await new Promise((resolve,reject) => {
			
			this.WebSocket.addEventListener('open',resolve);
			
			this.WebSocket.addEventListener('error',reject);
			
		});
		
	}
	
	async message(body){
		
		let json = JSON.parse(body);
		
		console.log('Сообщение API',json);
		
		if(!json){
			
			return;
			
		}
		
		if('response' in json){
			
			let {request, data, error} = json.response;
			
			if( !(request in this.awaiting) ){
				
				return;
				
			}
			
			if(error){
				
				this.awaiting[request].reject(error);
				
			}
			else{
				
				this.awaiting[request].resolve(data);
				
			}
			
			delete this.awaiting[request];
			
		}
		else if('from' in json){ // request
			
			let {action, data} = json.from;
			
			if('queue' in json){
				
				try{
					
					this.WebSocket.send(JSON.stringify({queue:json.queue}));
					
				}
				catch(error){
					
					console.log('API (queue)',error);
					
				}
				
			}
			
			if(action in this.events){
				console.log('Событие API',json.from);
				try{
					
					this.events[action](data);
					
				}
				catch(error){
					
					console.log('API (events/action)',error);
					
				}
				
			}
			
		}
		else{
			
			throw `Неизвестная структура сообщения -> ${JSON.stringify(json)}`;
			
		}
		
	}
	
	async request(object, method, data){
		
		for(let key in this.awaiting){
			
			if( (this.awaiting[key].object == object) && (this.awaiting[key].method == method) ){
				
				throw `Запрос уже выполнен, пожалуйста дождитесь ответа от сервера (15 секунд)... | ${method} -> ${object}`;
				
			}
			
		}
		
		let identify = Date.now();
		
		try{
			
			await this.say(identify,object,method,data);
			
		}
		catch(error){
			
			throw `Запрос не выполнен, ошибка интернет соединения`;
			
		}
		
		return await new Promise((resolve,reject) => {
			
			let rejectTimerId = setTimeout(() => {
				
				delete this.awaiting[identify];
				
				reject(`Ошибка интернет соединения, время ожидания ответа на запрос ${object} -> ${method} истекло`);
				
			},15000);
			
			this.awaiting[identify] = {object:object,method:method,resolve:data => {
				
				clearTimeout(rejectTimerId);
				
				resolve(data);
				
			},reject:error => {
				
				clearTimeout(rejectTimerId);
				
				reject(error);
				
			}};
			
		});
		
	}
	
	async silent(callback,object,method,data,infinity = false){
		
		let identify = `${method}${Date.now()}`; // если у нас более одного silent, то они перебивают друг друга так как это не async
		
		try{
			
			await this.say(identify,object,method,data);
			
		}
		catch(error){
			
			if(infinity){
				
				setTimeout(() => this.silent(callback,object,method,data,true),3000);
				
			}
			
			return;
			
		}
		
		let timerId = setTimeout(() => {
			
			delete this.awaiting[identify];
			
			if(infinity){
				
				this.silent(callback,object,method,data,true);
				
			}
			
		},15000);
		
		this.awaiting[identify] = {object:object,method:method,resolve:(data) => {
			
			clearTimeout(timerId);
			
			callback(data,false);
			
		},reject:(error) => {
			
			clearTimeout(timerId);
			
			callback(false,error);
			
		}};
		
		return;
		
	}
	
	async ghost(object,method,data){
		
		try{
			
			await this.say(0,object,method,data);
			
		}
		catch(error){
			
			
		}
		
		return;
		
	}
	
	async say(request,object,method,data = '', retryCount = 0){
		
		if (this.WebSocket.readyState === this.WebSocket.OPEN) {
		
		this.WebSocket.send(JSON.stringify({token:App.storage.data.token,request:request,object:object,method:method,data:data,version:`${PW_VERSION}.${APP_VERSION}`}));
		
		} else {

			if (retryCount < 5) {
				setTimeout(() => this.say(request,object,method,data, retryCount + 1) ,3000);
			}
			
		}
	}
	
}

class View {
	
	static activeTemplate = false;
	
	static activeAnimation = false;
	
	static defaultAnimation = {transform:['scale(1.1)','scale(1)'],opacity:[0,1],backdropFilter:['blur(0)','blur(15px)']};
	
	static defaultOptionAnimation = {duration:150,fill:'both',easing:'ease-out'};
	
	static setCss(name = 'content/style.css'){
		
		let css = DOM({tag:'link',rel:'stylesheet',href:name});
		
		document.head.appendChild(css);
		
	}
	
	static async show(method,value,value2){
		
		if( !(method in View) ){
			
			return;
			
		}
		
		let template = await View[method](value,value2);
		
		if(View.active){
			
			View.activeAnimation.reverse();
			
			View.activeAnimation.addEventListener('finish',() => {
				
				View.active.remove();

				Castle.isStaticSMCached = false;
				
				View.active = template;
				
				View.activeAnimation = template.animate(View.defaultAnimation,View.defaultOptionAnimation);
				
				document.body.append(template);
				
			});
			
		}
		else{
			
			View.active = template;
			
			View.activeAnimation = template.animate(View.defaultAnimation,View.defaultOptionAnimation);
			
			document.body.append(template);
			
		}
		
	}
	
	static authorization(){
		
		let login = DOM({tag:'input',placeholder:'Никнейм'}), password = DOM({tag:'input',placeholder:'Пароль',type:'password'});
		
		return DOM({style:'login_box'},DOM({style:'login-box-forma'},DOM({tag:'div'},DOM({tag:'img',style:'login-box-forma-logo',src:'content/img/logo_classic.webp'})),
		
		DOM({style:'login-box-forma-inputs'},
		login,
		password,
		DOM({style:'login-box-forma-buttons'},DOM({tag:'div',style:'login-box-forma-button',event:['click',() => App.authorization(login,password)]},'Войти'),DOM({tag:'div',style:'login-box-forma-button',event:['click',() => {
			
			View.show('registration');
			
		}]},'Регистрация'))
		)),DOM({style:'author'},`Prime World: Classic v.${PW_VERSION}.${APP_VERSION}`));
		
	}
	
	static registration(){
		
		let fraction = DOM({tag:'select'},
		DOM({tag:'option',value:0,disabled:true,selected:true},'Сторона'),
		DOM({tag:'option',value:1},'Адорнийцы'),
		DOM({tag:'option',value:2},'Докты')
		);
		
		let invite = DOM({tag:'input',placeholder:'Инвайт'});
		
		let login = DOM({tag:'input',placeholder:'Никнейм'});
		
		let password = DOM({tag:'input',placeholder:'Пароль',type:'password'});
		
		let password2 = DOM({tag:'input',placeholder:'Еще раз пароль',type:'password'});
		
		return DOM({style:'login_box'},DOM({style:'login-box-forma'},
		
		DOM({style:'login-box-forma-inputs'},
		fraction,
		invite,
		login,
		password,
		password2,
		DOM({style:'login-box-forma-buttons'},
		DOM({style:'login-box-forma-button',event:['click',() => App.registration(fraction,invite,login,password,password2)]},'Регистрация'),
		DOM({style:'login-box-forma-button',event:['click',() => View.show('authorization')]},'Назад')
		)
		),
		DOM({tag:'div'},DOM({tag:'img',style:'login-box-forma-logo',src:'content/img/logo_classic.webp'}))
		
		),DOM({style:'author'},`Prime World: Classic v.${PW_VERSION}.${APP_VERSION}`));
		
	}
	
	static progress(){
		
		let body = DOM({style:'progress'},DOM({style:'animation1'}),DOM());
		
		Splash.show(body,false);
		
		return body;
		
	}
	
	static async castle(){
		
		View.setCss('content/castle.css');
		
		let body = DOM({tag:'div', id: 'castle-body'});
		let backgroundImage = DOM({tag:'div', id:'castle-background-img'});

		if (!Castle.canvas) {
			Castle.canvas = DOM({tag:'canvas', id:'castle-game-surface'});
		}
		
		try{
			
			if (!Castle.gl) {
				Castle.initDemo(App.storage.data.fraction == 1 ? 'ad' : 'doct',Castle.canvas);
			}
			
			Castle.render = true;
			
		}
		catch(error){ // если замок не работает на устройстве, тогда рендерим старую версию главной страницы
			
			App.error(error);
			
			return await View.main();
			
		}
		
		body.append(backgroundImage,Castle.canvas,await View.castlePlay(),View.castleChat(),View.castleHeroes(), View.castleMusic());
		
		return body;
		
	}
	
	static async castlePlay(){
		
		let body = DOM({style:'castle-play'});
		
		let play = MM.play();
		
		play.classList.add('main-header-item');
		
		play.classList.add('castle-button-play');
		
		let lobby = DOM({style:'castle-play-lobby'});
		
		let data = await App.api.request('mmtest','loadParty'), players = new Array();
		
		MM.partyId = data.id;
		
		MM.activeSelectHero = data.users[App.storage.data.id].hero;
		
		MM.searchActive(data.users[MM.partyId].ready);
		
		for(let key in data.users){
			
			players.push({id:key,hero:data.users[key].hero,nickname:data.users[key].nickname,ready:data.users[key].ready,rating:data.users[key].rating,skin:data.users[key].skin});
			
		}
		
		if(players.length < 5){
			
			while(players.length < 5){
				
				players.push({id:0,hero:0,nickname:'',ready:0});
				
			}
			
		}
		
		for(let player of players){
			
			let item = DOM({style:'castle-play-lobby-player',data:{id:player.id}});
			
			let rankIcon = DOM({style:'castle-rank-icon'});
			
			item.style.backgroundImage = (player.hero) ? `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)` : `url(content/hero/empty.webp)`;
			
			let rank = DOM({style:'castle-rank'},DOM({style:'castle-rank-lvl'}, player.rating),rankIcon);
			
			if (player.rating) {
				item.append(rank);
			}
			
			let status = DOM({style:'castle-party-middle-item-not-ready'},'Не готов');
			
			if(player.id){
				
				if(player.ready){
					
					status.innerText = 'Готов';
					
					status.classList.replace('castle-party-middle-item-not-ready','castle-party-middle-item-ready');
					
				}
				else if(MM.partyId == player.id){
					
					status.innerText = 'Готов';
					
					status.classList.replace('castle-party-middle-item-not-ready','castle-party-middle-item-ready');
					
					
				}
				else if(player.id == App.storage.data.id){
					
					status.onclick = async () => {
						
						if(NativeAPI.status){
							if (PWGame.gameConnectionTestIsActive) {
								return;
							}
							
							PWGame.gameConnectionTestIsActive = true;

							try {
								await PWGame.check();

								await PWGame.testGameServerConnection();

								await PWGame.checkUpdates();
							} catch (e) {
								PWGame.gameConnectionTestIsActive = false;
								throw e;
							}

							PWGame.gameConnectionTestIsActive = false;
							
						}
						else{
							
							//if(!await Protect.checkInstall()){
								
								//App.error('Нужен windows лаунчер');
								
								//return;
								
							//}
							
						}
						
						await App.api.request('mmtest','readyParty',{id:MM.partyId});
						
						status.onclick = false;
						
					}
					
					status.innerText = 'Подтвердить';
					
				}

				item.style.backgroundImage = (player.hero) ? `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)` : `url(content/hero/empty.webp)`;
				
				
			}
			else{
				
				item.innerText = '+';
				
				status.style.opacity = 0;
				
				// lvl.style.opacity = 0;
				
				//rank.style.opacity = 0;
				
			}

			let shortenNickname = player.nickname ? (
			player.nickname.length > 17 ? player.nickname.substring(0, 17) + '…' : player.nickname
			) : null;

			let nickname = DOM({style:'castle-party-middle-item-nickname'},`${shortenNickname ? shortenNickname : 'Добавить'}`);
			
			let playerX = DOM({id:`PP${player.id}`,style:'castle-party-middle-item', title: nickname.innerText},nickname,item,status); 
			
			playerX.dataset.id = player.id;
			
			if( (MM.partyId == App.storage.data.id) && (playerX.dataset.id != App.storage.data.id) && (playerX.dataset.id != 0) ){
				
				nickname.append(DOM({style: 'rz', tag:'span',event:['click', async () => {
					
					await App.api.request('mmtest','leaderKickParty',{id:playerX.dataset.id});
					
				}]},'[X]'));
				
			}
			
			if( (MM.partyId != App.storage.data.id) && (playerX.dataset.id == App.storage.data.id) ){
				
				nickname.append(DOM({tag:'span',event:['click', async () => {
					
					await App.api.request('mmtest','leaveParty',{id:MM.partyId});
					
					View.show('castle');
					
				}]},'[X]'));
				
			}
			
			item.addEventListener('click', async () => {
				
				if(item.dataset.id == App.storage.data.id){
					
					if(MM.active){
						
						return;
						
					}
					
					let request = await App.api.request('build','heroAll');
					
					MM.hero = request;
					
					request.push({id:0});
					
					let bodyHero = DOM({style:'party-hero'});
					
					let preload = new PreloadImages(bodyHero);
					
					for(let item2 of request){
						
						let hero = DOM();
						
						hero.addEventListener('click', async () => {
							
							try{
								
								await App.api.request('mmtest','heroParty',{id:MM.partyId,hero:item2.id});
								
							}
							catch(error){
								
								return App.error(error);
								
							}
							
							item.style.backgroundImage = (item2.id) ? `url(content/hero/${item2.id}/${item2.skin ? item2.skin : 1}.webp)` : `url(content/hero/empty.webp)`;
							
							MM.activeSelectHero = item2.id;
							
							Splash.hide();
							
						});
						
						if(item2.id){
							
							hero.dataset.url = `content/hero/${item2.id}/${item2.skin ? item2.skin : 1}.webp`;
							
						}
						else{
							
							hero.dataset.url = `content/hero/empty.webp`;
							
						}
						
						preload.add(hero);
						
					}
					
					Splash.show(bodyHero,false);
					
				}
				
				if( ( (item.dataset.id == 0) && ( (!MM.partyId ) || (MM.partyId == App.storage.data.id) ) ) ){
					
					let input = DOM({tag:'input',style:'search-input'});
					
					let body = DOM({style:'search-body'});
					
					let search = DOM({style:'search'},input,body,DOM({style:'search-bottom',event:['click',() => {
						
						Splash.hide();
						
					}]},`[Назад]`));
					
					input.addEventListener('input', async () => {
						
						let request = await App.api.request('mmtest','findUser',{name:input.value});
						
						if(body.firstChild){
							
							while(body.firstChild){
								
								body.firstChild.remove();
								
							}
							
						}
						
						for(let item of request){
							
							body.append(DOM({event:['click', async () => {
								
								await App.api.request('mmtest','inviteParty',{id:item.id});
								
								App.notify(`Приглашение отправлено игроку ${item.nickname}`,1000);
								
								// Splash.hide();
								
							}]},item.nickname));
							
						}
						
					});
					
					Splash.show(search,false);
					
					input.focus();
					
				}
				
			})
			
			lobby.append(playerX);
			
		}
		
		body.append(play,lobby);
		
		return body; 
		
	}
	
	static castleMusic(){
		
		let body = DOM({style:['castle-music','button-outline'],event:['click',() => Castle.toggleMusic()]});
		
		return body; 
		
	}
	
	static castleMenu(){
		
		let body = DOM({style:'castle-menu'});
		
		return body;
		
	}
	
	static castleChat(){
		
		let body = DOM({style:'castle-chat'},Chat.body);
		
		return body;
		
	}
	
	static castleHeroes(){
		
		let body = DOM({style:'castle-hero'}), preload = new PreloadImages(body);
		
		body.addEventListener('wheel',function(event){
			
			let modifier = 0;
			
			if (event.deltaMode == event.DOM_DELTA_PIXEL) {
				
				modifier = 1;
				
			} else if (event.deltaMode == event.DOM_DELTA_LINE) {
				
				modifier = parseInt(getComputedStyle(this).lineHeight);
				
			} else if (event.deltaMode == event.DOM_DELTA_PAGE) {
				
				modifier = this.clientHeight;
				
			}
			
			if (event.deltaY != 0) {
				
				this.scrollLeft += modifier * event.deltaY;
				
				event.preventDefault();
				
			}
			
		});
		
		App.api.silent((result) => {
			
			MM.hero = result;
			
			for(const item of result){

				let heroName = DOM({style:'castle-hero-name'}, item.name.length > 12 ? item.name.substring(0, 10) + '…' : item.name);

				let heroNameBase = DOM({style:'castle-item-hero-name'}, heroName);
				
				let rankIcon = DOM({style:'rank-icon'});
				
				rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;
				
				let rank = DOM({style:'rank'},DOM({style:'rank-lvl'},item.rating),rankIcon);
				
				const hero = DOM({style:'castle-hero-item'},rank, heroNameBase);
				
				hero.addEventListener('click',() => View.show('build',item.id));
				
				hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;
				
				preload.add(hero);
				
			}
			
		},'build','heroAll');
		
		return body;
		
	}
	
	static header(){
		
		let play = MM.play();
		
		play.classList.add('main-header-item');
		
		play.classList.add('button-play');
		
		let menu = DOM({style:'main-header'},DOM({tag:'img',src:'content/img/logo.webp',event:['click',() => View.show('castle')]}),play);
		
		if(App.isAdmin()){
			
			let adm = DOM({style:'main-header-item',event:['click',() => {
				
				let body = document.createDocumentFragment();
				
				body.append(DOM({style:'splash-content-button',event:['click',() => {
					
					View.show('talents');
					
					Splash.hide();
					
				}]},'Таланты (обычные)'),DOM({style:'splash-content-button',event:['click',() => {
					
					View.show('talents2');
					
					Splash.hide();
					
				}]},'Таланты (классовые)'),DOM({style:'splash-content-button',event:['click',() => {
					
					View.show('users');
					
					Splash.hide();
					
				}]},'Пользователи'),DOM({style:'splash-content-button',event:['click',() => Splash.hide()]},'[X]'));
				
				Splash.show(body);
				
			}]},'Админ');
			
			adm.classList.add('animation1');
			
			adm.style.color = 'rgba(255,255,255,1)';
			
			menu.append(adm);
			
		}
		
		menu.append(
		DOM({style:'main-header-item',event:['click',() => View.show('castle')]},NativeAPI.status ? 'Лобби' : 'Замок'),
		DOM({style:'main-header-item',event:['click',() => View.show('builds')]},'Билды'),
		DOM({style:'main-header-item',event:['click',() => View.show('history')]},'История'),
		DOM({style:'main-header-item',event:['click',() => View.show('top')]},'Рейтинг'),
		DOM({style:'main-header-item',event:['click',() => View.show('game')]},'Фарм'),
		DOM({style:'main-header-item',event:['click',() => {
			
			
			let logout = DOM({event:['click', async () => {
				
				App.exit();
				
				Splash.hide();
				
			}]},'Выйти из аккаунта');
			
			let close = DOM({event:['click',() => Splash.hide()]},'Отмена');
			
			let wrap = DOM({style:'wrap'},logout,close);

			if (NativeAPI.status) {
			
				let exit = DOM({event:['click',() => NativeAPI.exit()]},'Выйти из игры');
			
				wrap = DOM({style:'wrap'},logout,exit,close);

			}
			
			let dom = DOM({style:'div'},'Выйти?',wrap);
			
			Splash.show(dom);
			
		}]},'Выйти')
		);
		
		return menu;
		
	}
	
	static async main(data){
		
		let body = DOM({style:'main'});
		
		let middle = DOM({style:'party-middle'});

		// const chatInput = DOM({tag: 'input', placeholder: 'Enter your message here', style: 'chat-input'});
		// const chatMessages = DOM({style: 'chat-input'});
		// const chat = DOM({style: 'chat'}, chatMessages, chatInput);
		
		// let party = DOM({style:'party'},middle, chat);
		
		let top = DOM({style:'top'});
		
		App.api.silent((result) => {
			
			let number = 1;
			
			for(let player of result){
				
				let rank = DOM({style:'top-item-hero-rank'});
				
				rank.style.backgroundImage = `url(content/ranks/${Rank.icon(player.rating)}.webp)`;
				
				let hero = DOM({style:'top-item-hero'},rank);
				
				hero.style.backgroundImage = `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)`;
				
				let item = DOM({style:'top-item',event:['click',() => Build.view(player.id,player.hero,player.nickname)]},hero,DOM({style:'top-item-player'},DOM(`#${number}. ${player.nickname}`),DOM(`${player.rating}`)));
				
				if(number == 1){
					
					//item.style.background = 'rgba(255,50,0,0.9)';
					
					item.classList.add('animation1');
					
				}
				/*
				else if(number == 2){
					
					item.style.background = 'rgba(255,100,0,0.9)';
					
				}
				else if(number == 3){
					
					item.style.background = 'rgba(150,50,255,0.9)';
					
				}
				else if(number == 4){
					
					item.style.background = 'rgba(50,100,200,0.9)';
					
				}
				*/
				top.append(item);
				
				number++;
				
			}
			
		},'mm','top');
		
		let party = DOM({style:'party'},middle);
		
		let players = new Array();
		
		data = (data) ? data : await App.api.request('mmtest','loadParty');
		
		MM.partyId = data.id;
		
		MM.activeSelectHero = data.users[App.storage.data.id].hero;
		
		MM.searchActive(data.users[MM.partyId].ready);
		
		for(let key in data.users){
			
			players.push({id:key,hero:data.users[key].hero,nickname:data.users[key].nickname,ready:data.users[key].ready,rating:data.users[key].rating,skin:data.users[key].skin});
			
		}
		
		if(players.length < 5){
			
			while(players.length < 5){
				
				players.push({id:0,hero:0,nickname:'',ready:0});
				
			}
			
		}
		
		for(let item of players){
			
			let img = DOM({style:'party-middle-item-middle'});
			
			let rankIcon = DOM({style:'rank-icon'});
			
			rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;
			
			let rank = DOM({style:'rank'},DOM({style:'rank-lvl'},item.rating),rankIcon);
			
			img.append(rank);
			
			let status = DOM({style:'party-middle-item-not-ready'},'Не готов');
			
			if(item.id){
				
				if(item.ready){
					
					status.innerText = 'Готов';
					
					status.classList.replace('party-middle-item-not-ready','party-middle-item-ready');
					
				}
				else if(MM.partyId == item.id){
					
					status.innerText = 'Готов';
					
					status.classList.replace('party-middle-item-not-ready','party-middle-item-ready');
					
					
				}
				else if(item.id == App.storage.data.id){
					
					status.onclick = async () => {
						
						if(NativeAPI.status){
							if (PWGame.gameConnectionTestIsActive) {
								return;
							}
							
							PWGame.gameConnectionTestIsActive = true;

							try {
								await PWGame.check();

								await PWGame.testGameServerConnection();

								await PWGame.checkUpdates();
							} catch (e) {
								PWGame.gameConnectionTestIsActive = false;
								throw e;
							}

							PWGame.gameConnectionTestIsActive = false;
							
						}
						else{
							
							if(!await Protect.checkInstall()){
								
								App.error('Проверка');
								
								return;
								
							}
							
						}
						
						await App.api.request('mmtest','readyParty',{id:MM.partyId});
						
						status.onclick = false;
						
					}
					
					status.innerText = 'Подтвердить';
					
				}
				
				img.style.backgroundImage = (item.hero) ? `url(content/hero/${item.hero}/${item.skin ? item.skin : 1}.webp)` : `url(content/hero/empty.webp)`;
				
			}
			else{
				
				img.innerText = '+';
				
				status.style.opacity = 0;
				
				// lvl.style.opacity = 0;
				
				//rank.style.opacity = 0;
				
			}
			
			let nickname = DOM({style:'party-middle-item-nickname'},`${item.nickname ? item.nickname : 'Добавить'}`);
			
			let player = DOM({id:`PP${item.id}`,style:'party-middle-item'},nickname,img,status); // TODO use this for lvl and rank
			// let player = DOM({id:`PP${item.id}`,style:'party-middle-item'},nickname,img,status);
			
			player.dataset.id = item.id;
			
			if( (MM.partyId == App.storage.data.id) && (player.dataset.id != App.storage.data.id) && (player.dataset.id != 0) ){
				
				nickname.append(DOM({tag:'span',event:['click', async () => {
					
					await App.api.request('mmtest','leaderKickParty',{id:player.dataset.id});
					
				}]},'[X]'));
				
			}
			
			if( (MM.partyId != App.storage.data.id) && (player.dataset.id == App.storage.data.id) ){
				
				nickname.append(DOM({tag:'span',event:['click', async () => {
					
					await App.api.request('mmtest','leaveParty',{id:MM.partyId});
					
					View.show('castle');
					
				}]},'[X]'));
				
			}
			
			img.addEventListener('click', async () => {
				
				if(player.dataset.id == App.storage.data.id){
					
					if(MM.active){
						
						return;
						
					}
					
					let request = await App.api.request('build','heroAll');
					
					MM.hero = request;
					
					request.push({id:0});
					
					let bodyHero = DOM({style:'party-hero'});
					
					let preload = new PreloadImages(bodyHero);
					
					for(let item of request){
						
						let hero = DOM();
						
						hero.addEventListener('click', async () => {
							
							try{
								
								await App.api.request('mmtest','heroParty',{id:MM.partyId,hero:item.id});
								
							}
							catch(error){
								
								return App.error(error);
								
							}
							
							MM.activeSelectHero = item.id;
							
							Splash.hide();
							
						});
						
						if(item.id){
							
							hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;
							
						}
						else{
							
							hero.dataset.url = `content/hero/empty.webp`;
							
						}
						
						preload.add(hero);
						
					}
					
					Splash.show(bodyHero,false);
					
				}
				
				if( ( (player.dataset.id == 0) && ( (!MM.partyId ) || (MM.partyId == App.storage.data.id) ) ) ){
					
					let input = DOM({tag:'input',style:'search-input'});
					
					let body = DOM({style:'search-body'});
					
					let search = DOM({style:'search'},input,body,DOM({style:'search-bottom',event:['click',() => {
						
						Splash.hide();
						
					}]},`[Назад]`));
					
					input.addEventListener('input', async () => {
						
						let request = await App.api.request('mmtest','findUser',{name:input.value});
						
						if(body.firstChild){
							
							while(body.firstChild){
								
								body.firstChild.remove();
								
							}
							
						}
						
						for(let item of request){
							
							body.append(DOM({event:['click', async () => {
								
								await App.api.request('mmtest','inviteParty',{id:item.id});
								
								App.notify(`Приглашение отправлено игроку ${item.nickname}`,1000);
								
								// Splash.hide();
								
							}]},item.nickname));
							
						}
						
					});
					
					Splash.show(search,false);
					
					input.focus();
					
				}
				
			})
			
			middle.append(player);
			
		}
		
		body.append(View.header(),DOM({style:'main-body-column'},top,party));
		// setTimeout(() => {
		// 	MM.lobby({id:1,users:{
		// 	1:{nickname:'ifst',hero:4,ready:1,rating:1100,select:false,team:1},
		// 	10:{nickname:'Nesh',hero:3,ready:1,rating:1300,select:false,team:1},
		// 	1858:{nickname:'vitaly-zdanevich',hero:3,ready:1,rating:1100,select:false,team:1},
		// 	2:{nickname:'Коао',hero:22,ready:1,rating:1100,select:false,team:1},
		// 	4:{nickname:'XIIIAngel',hero:12,ready:1,rating:1100,select:false,team:1},
		// 	5:{nickname:'Lantarm',hero:8,ready:1,rating:1100,select:false,team:2},
		// 	6:{nickname:'Stagven_YouTube',hero:2,ready:1,rating:1100,select:false,team:2},
		// 	7:{nickname:'Farfania',hero:9,ready:1,rating:1100,select:false,team:2},
		// 	8:{nickname:'Rekongstor',hero:25,ready:1,rating:1100,select:false,team:2},
		// 	9:{nickname:'Hatem',hero:0,ready:1,rating:2200,select:false,team:2}
		// 	},target:1,map:[1,2,4,5,6,7,8,9,10,1858]});
		// }, 5000);
		
		return body;
		
	}

	static async history(){
		
		let body = DOM({style:'main'}), history = DOM({style:'history'});
		
		let result = await App.api.request('mmtest','history');
		
		for(let item of result){
			
			let hero = DOM();
			
			hero.style.backgroundImage = `url(content/hero/${item.hero}/${item.skin ? item.skin : 1}.webp)`;
			
			let game = DOM({style:'history-item'},hero,DOM({tag:'div'},(item.team == 1) ? 'Докты' : 'Адорния'),DOM({tag:'div'},(item.team == item.win) ? +item.rating : -item.rating),DOM({tag:'div'},new Date(item.added).toLocaleString()));
			
			if(item.team == item.win){
				
				game.style.background = 'rgba(51,255,51,0.5)';
				
			}
			
			history.append(game);
			
		}
		
		body.append(View.header(),history);
		
		return body;
		
	}
	
	static async top(hero = 0){
		
		let body = DOM({style:'main'});
		
		let result = await App.api.request('mmtest','top',{limit:100,hero:hero});
		
		if(!result){
			
			throw 'Рейтинг отсутствует';
			
		}
		
		let top = DOM({style:'top-scroll'},DOM({style:'top-filter',title:'Выберите героя, чтобы отсортировать игроков зала славы',event:['click', async () => {
			
			let request = await App.api.request('build','heroAll');
			
			request.push({id:0});
			
			let bodyHero = DOM({style:'party-hero'});
			
			let preload = new PreloadImages(bodyHero);
			
			for(let item of request){
				
				let hero = DOM();
				
				if(item.id){
					
					hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;
					
				}
				else{
					
					hero.dataset.url = `content/hero/empty.webp`;
					
				}
				
				hero.addEventListener('click', async () => {
					
					View.show('top',item.id);
					
					Splash.hide();
					
				});
				
				preload.add(hero);
				
			}
			
			Splash.show(bodyHero,false);
			
		}]},DOM({tag:'div'}),DOM({tag:'div'})));
		
		top.firstChild.classList.add('animation1');
		
		top.firstChild.firstChild.style.backgroundImage = `url(content/hero/${result[0].hero}/${result[0].skin ? result[0].skin : 1}.webp)`;
		
		top.firstChild.lastChild.innerText = `#1. ${result[0].nickname}`;
		
		let number = 1;
		
		for(let player of result){
			
			let rank = DOM({style:'top-item-hero-rank'});
			
			rank.style.backgroundImage = `url(content/ranks/${Rank.icon(player.rating)}.webp)`;
			
			let hero = DOM({style:'top-item-hero'},rank);
			
			hero.style.backgroundImage = `url(content/hero/${player.hero}/${player.skin ? player.skin : 1}.webp)`;
			
			let item = DOM({style:'top-item',event:['click',() => Build.view(player.id,player.hero,player.nickname)]},hero,DOM({style:'top-item-player'},DOM(`#${number}. ${player.nickname}`),DOM(`${player.rating}`)));
			
			top.append(item);
			
			number++;
			
		}
		
		body.append(View.header(),top);
		
		return body;
		
	}
	
	static builds(){
		
		let body = DOM({style:'main'});
		
		let hero = DOM({style:'hero'});
		
		let preload = new PreloadImages(hero,(element) => {
			/*
			let test = () => {
				
				element.dataset.slide = ( ( ( Number(element.dataset.slide) + 1 ) > element.dataset.total ) ? 1 : ( Number(element.dataset.slide) + 1 ));
				
				PreloadImages.load(() => {
					
					let firstSlide = DOM(), twoSlide = DOM();
					
					firstSlide.style.backgroundImage = element.style.backgroundImage;
					
					element.append(firstSlide);
					
					element.style.backgroundImage = 'none';
					
					twoSlide.style.opacity = 0;
					
					element.append(twoSlide);
					
					twoSlide.style.backgroundImage = `url("content/hero/${element.dataset.id}/${element.dataset.slide}.webp")`;
					
					firstSlide.animate({opacity:[1,0]},{duration:500,easing:'ease-out',fill:'forwards'});
					
					let animation = twoSlide.animate({opacity:[0,1]},{duration:500,easing:'ease-in',fill:'forwards'});
					
					animation.onfinish = () => {
						
						element.style.backgroundImage = twoSlide.style.backgroundImage;
						
						firstSlide.remove();
						
						twoSlide.remove();
						
						setTimeout(() => {
							
							test();
							
						},App.getRandomInt(5000,15000));
						
					}
					
				},`content/hero/${element.dataset.id}/${element.dataset.slide}.webp`);
				
			}
			
			if(element.dataset.total > 1){
				
				setTimeout(() => {
					
					test();
					
				},App.getRandomInt(2500,5000));
				
			}
			*/
		});
		
		App.api.silent((result) => {
			
			MM.hero = result;
			
			for(const item of result){
				//item.rating = App.getRandomInt(1100,3000);
				let rankIcon = DOM({style:'rank-icon'});
				
				rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;
				
				let rank = DOM({style:'rank'},DOM({style:'rank-lvl'},item.rating),rankIcon);
				
				const hero = DOM({style:'hero-item'},DOM({tag:'span', style: 'name'},item.name),rank);
				
				hero.addEventListener('click',() => View.show('build',item.id));
				
				hero.dataset.id = item.id;
				
				hero.dataset.slide = 1;
				
				hero.dataset.total = item.total;
				
				hero.dataset.url = `content/hero/${item.id}/${item.skin ? item.skin : 1}.webp`;
				
				preload.add(hero);
				
			}
			
		},'build','heroAll');
		
		body.append(View.header(),DOM({style:'main-body-full'},hero));
		
		return body;
		
	}
	
	static inventory(){
		
		let body = DOM({style:'main'});
		
		let inventory = DOM({style:'inventory'});
		
		App.api.silent((result) => {
			
			for(let item of result){
				
				let unit = DOM({style:`rarity${item.rarity}`});
				
				unit.style.backgroundImage = `url(content/talents/${item.id}.webp)`;
				
				unit.append(DOM({tag:'span'},item.score));
				
				inventory.append(unit);
				
			}
			
		},'gamev2','inventory');
		

		body.append(DOM({style:'main-header'},
		DOM({tag:'img',src:'content/img/logo.webp'}),
		DOM({style:'main-header-item',event:['click',() => View.show('castle')]},App.storage.data.login),
		DOM({style:'main-header-item',event:['click',() => View.show('inventory')]},'Осколки'),
		DOM({style:'main-header-item',event:['click',() => View.show('game')]},'Фарм'),
		DOM({style:'main-header-item',event:['click',() => App.exit()]},'Выйти')
		),
		DOM({style:'main-body-full'},inventory)
		);

		return body;
		
	}
	
	static game(){
		
		let body = DOM({style:'game'});
		
		let button = DOM({style:'game-button',event:['click', async () => {
			
			let request = await App.api.request('gamev2','start');
			
			if('error' in request){
				
				button.innerText = `Начать фарм можно будет через ${request.error} мин.`;
				
				return;
				
			}
			
			dscription.remove();
			
			request.back = () => {
				
				View.show('castle');
				
			}
			
			request.finish = async () => {
				
				if(!confirm('Завершить фарм?')){
					
					return;
					
				}
				
				await App.api.request('gamev2','finish');
				
				View.show('castle');
				
			}
			
			request.exit = () => {
				
				View.show('castle');
				
			}
			
			Game.init(body,request);
			
		}]},'Начать фарм');
		
		let dscription = DOM({style:'game-description'},
		DOM({tag:'h1'},'Лорды и леди!'),
		DOM({tag:'p'},'— необходимо собрать 1000 осколков одного и того же таланта, чтобы получить 1 талант для билда на старте сервера Prime World;'),
		DOM({tag:'p'},'— на одну карту рассчитано 100 ходов;'),
		DOM({tag:'p'},'— кулдаун между играми 60 минут;'),
		DOM({tag:'p'},'— чтобы сделать ход, переставляйте два соседних таланта местами. Если такая перестановка приводит к образованию комбинации, то «выстроившиеся»‎ таланты исчезают, и на их место падают таланты верхних рядов;'),
		DOM({tag:'p'},'— засчитывается комбинация минимум из трёх одинаковых талантов;'),
		DOM({tag:'p'},'— в рейтинге на главной страничке отображается сумма всех очков на одного игрока за всё время.'),
		button,
		DOM({style:'game-button',event:['click',() => View.show('castle')]},'Назад')
		);
		
		body.append(dscription);
		
		return body;
		
	}
	
	static async build(heroId,targetId = 0){

		Castle.render = false;
		
		const body = DOM({style:'main-vertical'});
		
		await Build.init(heroId,targetId);
		
		// build-field-top ->    play,DOM({event:['click',() => View.show('main')]},'Закрыть окно билда [X]')
		body.append(
		DOM({style:'build-field-top'},Build.listView),
		DOM({style:'build'},Build.heroView,Build.levelView,Build.fieldView,Build.inventoryView,Build.rarityView),
		DOM({style:'build-field-bottom'},Build.activeBarView)
		);
		
		return body;
		
	}
	
	static async talents(){
		
		let body = DOM({style:'main'}), adm = DOM({style:'adm'},DOM({event:['click',() => View.show('castle')]},'[X]'));
		
		let result = await App.api.request('build','talentAll');
		
		for(let item of result){
			
			let div = DOM({tag:'div'});
			
			div.append(DOM(`id${item.id}`),DOM({tag:'img',src:`content/talents/${item.id}.webp`}));
			
			for(let key in item){
				
				if(key == 'id'){
					
					continue;
					
				}
				
				div.append(DOM({tag:'div'},key),App.input( async (value) => {
					
					let object = new Object();
					
					object[key] = value;
					
					await App.api.request('build','talentEdit',{id:item.id,object:object});
					
				},{value:item[key]}));
				
			}
			
			adm.append(div);
			
		}
		
		body.append(adm);
		
		return body;
		
	}
	
	static async talents2(){
		
		let body = DOM({style:'main'}), adm = DOM({style:'adm'},DOM({event:['click',() => View.show('castle')]},'[X]'));
		
		let result = await App.api.request('build','talentHeroAll');
		
		for(let item of result){
			
			let div = DOM({tag:'div'});
			
			div.append(DOM(`id${item.id}`),DOM({tag:'img',src:`content/htalents/${item.id}.webp`}));
			
			for(let key in item){
				
				if(key == 'id'){
					
					continue;
					
				}
				
				div.append(DOM({tag:'div'},key),App.input( async (value) => {
					
					let object = new Object();
					
					object[key] = value;
					
					await App.api.request('build','talentHeroEdit',{id:item.id,object:object});
					
				},{value:item[key]}));
				
			}
			
			adm.append(div);
			
		}
		
		body.append(adm);
		
		return body;
		
	}
	
	static async users(){

		let filter = DOM({event:['click', () => {
			let users = document.getElementsByClassName('user-item');
			for (let user in users) {
				if (users[user].className && users[user].className == 'user-item') {
					let isBlocked = users[user].getElementsByClassName('userParam-blocked')[0].nextSibling.value != '0';
					if (!isBlocked) {
						users[user].style.display = users[user].style.display == 'none' ? 'inherit' : 'none';
					}
				}
			}
		}]}, 'Filter only banned');

		
		let body = DOM({style:'main'}), adm = DOM({style:'adm'},DOM({event:['click',() => View.show('castle')]},'[X]'), filter);
		
		let result = await App.api.request('user','all');
		
		for(let item of result){
			
			let div = DOM({tag:'div', className: 'user-item'});
			
			div.append(DOM(`id${item.id}`),DOM(`inv ${item.invite}`));
			
			for(let key in item){
				
				if(['id','invite'].includes(key)){
					
					continue;
					
				}
				
				if(key == 'added'){
					
					div.append(DOM(`${new Date(item.added).toLocaleString('ru-RU')}`));
					
					continue;
					
				}
				
				div.append(DOM({tag:'div', className:'userParam-' + key},key),App.input( async (value) => {
					
					let object = new Object();
					
					object[key] = value;
					
					await App.api.request('user','edit',{id:item.id,object:object});
					
				},{value:item[key]}));
				
			}
			
			div.append(DOM({event:['click', async () => {
				
				if(!confirm(`Сброс пароля «${item.nickname}»?`)){
					
					return;
					
				}
				
				let password = await App.api.request('user','restore',{id:item.id});
				
				prompt('Сброс пароля произведен успешно',`Пароль: ${password}`);
				
			}]},`RESTORE`));
			
			adm.append(div);
			
		}
		
		body.append(adm);
		
		return body;
		
	}
	
}

class Rank {
	
	static icon(rating){
		
		if(rating <= 1199){
			
			return 1;
			
		}
		else if(rating <= 1299){
			
			return 2;
			
		}
		else if(rating <= 1399){
			
			return 3;
			
		}
		else if(rating <= 1499){
			
			return 4;
			
		}
		else if(rating <= 1599){
			
			return 5;
			
		}
		else if(rating <= 1699){
			
			return 6;
			
		}
		else if(rating <= 1799){
			
			return 7;
			
		}
		else if(rating <= 1899){
			
			return 8;
			
		}
		else if(rating <= 1999){
			
			return 9;
			
		}
		else if(rating <= 2099){
			
			return 10;
			
		}
		else if(rating <= 2199){
			
			return 11;
			
		}
		else{
			
			return 12;
			
		}
		
	}
	
}

class Build{
	
	static language = {
		sr: 'Сила/Разум',
		hp: 'Здоровье',
		provorstvo: 'Проворство',
		hitrost: 'Хитрость',
		regenmp: 'Регенерация энергии',
		stoikost: 'Стойкость',
		volia: 'Воля',
		ph: 'Проворство/Хитрость',
		sv: 'Стойкость/Воля',
		razum: 'Разум',
		sila: 'Сила',
		speedtal: '%<speedtal></speedtal>',
		srsv: 'Сила/Разум/Стойкость/Воля',
		krajahp: 'Кража здоровья',
		regenhp: 'Регенерация здоровья',
		mp: 'Энергия',
		krajamp: 'Кража энергии',
		stoikostrz: 'Стойкость на родной земле',
		voliarz: 'Воля на родной земле',
		speedtalrz: '%<speedtal></speedtal> на родной земле',
		speedtalvz: '%<speedtal></speedtal> на вражеской земле',
		hitrostrz: 'Хитрость на родной земле',
		provorstvorz: 'Проворство на родной земле',
		silarz: 'Сила на родной земле',
		razumrz: 'Разум на родной земле',
		krajahprz: 'Кража здоровья на родной земле',
		regenhpvz: 'Регенерация здоровья на вражеской земле',
		hitrostvz: 'Хитрость на вражеской земле',
		provorstvovz: 'Проворство на вражеской земле',
		regenmpvz: 'Регенерация энергии на вражеской земле',
		silavz: 'Сила на вражеской земле',
		razumvz: 'Разум на вражеской земле',
		svvz: 'Стойкость/Воля на вражеской земле',
		krajahpvz: 'Кража здоровья на вражеской земле',
		vs: 'Воля/Стойкость',
		speed: 'Скорость',
		speedrz: 'Скорость на родной земле',
		speedvz: 'Скорость на вражеской или нейтральной земле',
		dopspeed: 'Дополнительный бонус к скорости',
		speedstak: 'Стак скорости',
	};
	
	static talentRefineByRarity = {
		4: 5.0,
		3: 7.0,
		2: 9.0,
		1: 12.0
	}
	
	static async view(user,hero,nickname = '',animate = true){
		
		let request = await App.api.request('build','get',{user:user,hero:hero});
		
		let container = DOM();
		
		container.style.width = '30vw';
		
		container.style.height = '30vw';
		
		let state = false, get = DOM({event:['click', async () => {
			
			if(!state){
				
				get.innerText = 'Перезаписать текущий билд?';
				
				state = true;
				
				return;
				
			}
			
			await App.api.request('build','steal',{user:user,hero:hero});
			
			View.show('build',hero);
			
			Splash.hide();
			
		}]},`Украсть билд?`);
		
		let bottom = DOM({style:'build-bottom'},get,DOM({event:['click',() => Splash.hide()]},`[Х]`));
		
		if(animate){
			
			bottom.style.opacity = 0;
			
		}
		
		container.append(Build.viewModel(request,() => {
			
			bottom.animate({opacity:[0,1]},{duration:500,fill:'both',easing:'ease-out'});
			
		},animate));
		
		Splash.show(DOM({style:'div'},DOM({style:'build-top'},nickname),container,bottom),false);
		
	}
	
	static viewModel(data,callback,animate = true){
		
		let body = DOM({style:'build-body'}), i = 1, row = DOM({style:'build-body-row'}), elements1 = new Array(), elements2 = new Array();
		
		body.append(row);
		
		for(let item of data){
			
			let talent = DOM();
			
			if(item != 0){
				
				if(animate){
					
					talent.style.opacity = 0;
					
					talent.style.zIndex = 9999;
					
					if(item > 0){
						
						elements2.push(talent);
						
					}
					else{
						
						elements1.push(talent);
						
					}
					
				}
				
				talent.style.backgroundImage = (item > 0) ? `url(content/talents/${item}.webp)` : `url(content/htalents/${Math.abs(item)}.webp)`;
				
			}
			
			if(i > 6){
				
				i = 2;
				
				row = DOM({style:'build-body-row'});
				
				row.append(talent);
				
				body.append(row);
				
				continue;
				
			}
			else{
				
				row.append(talent);
				
			}
			
			i++;
			
		}
		
		if(!animate){
			
			return body;
			
		}
		
		elements1 = Game.shuffle(elements1);
		
		elements2 = Game.shuffle(elements2);
		
		let delay = 0, number = 1;
		
		for(let element of elements1){
			
			delay += 350;
			
			let animate = element.animate({opacity:[0,1],transform:['scale(3)','scale(1)']},{delay:delay,duration:350,fill:'both',easing:'ease-out'});
			
			if(number == elements1.length){
				
				animate.onfinish = () => {
					
					setTimeout(() => {
						
						let number = 1;
						
						delay = 0;
						
						for(let element of elements2){
							
							delay += 50;
							
							let animate = element.animate({opacity:[0,1],transform:['scale(3)','scale(1)']},{delay:delay,duration:350,fill:'both',easing:'ease-out'});
							
							if(number == elements2.length){
								
								animate.onfinish = () => {
									
									if(callback){
										
										callback();
										
									}
									
								}
								
							}
							
							number++;
							
						}
						
					},500);
					
				}
				
			}
			
			number++;
			
		}
		
		return body;
		
	}
	
	static async init(heroId,targetId){
		
		Build.talents = new Object();

		Build.descriptionView = document.createElement('div');
		
		Build.CleanInvalidDescriptions();
		
		Build.descriptionView.classList.add('build-description');
		
		Build.descriptionView.style.display = 'none';
		
		Build.descriptionView.onmouseover = () => {
			
			Build.descriptionView.style.display = 'none';
			
		}
		
		document.body.append(Build.descriptionView);
		
		Build.listView = document.createElement('div');
		Build.listView.classList.add('build-list');
	
		Build.heroView = document.createElement('div');
		
		Build.heroView.classList.add('build-hero');
		
		Build.levelView = document.createElement('div');
		
		Build.levelView.classList.add('build-level');
		
		Build.fieldView = document.createElement('div');
		
		Build.fieldView.classList.add('build-field');
		
		Build.fieldConflict = new Object();
	
		// ================================================

		const buttonTalents = document.createElement('button');
		buttonTalents.innerText = 'Таланты';
		buttonTalents.title = 'TODO еще не готово - команда PW Classic работает над этим';
		buttonTalents.classList.add('talents', 'btn-hover', 'color-1');
		buttonTalents.title = 'Библиотека талантов';

		const separator = document.createElement('div');
		separator.innerText = '|';
		separator.classList.add('separator');


		const buttonSets = document.createElement('button');
		buttonSets.innerText = 'Сеты';
		buttonSets.title = 'TODO еще не готово - команда PW Classic работает над этим';
		buttonSets.classList.add('sets', 'btn-hover', 'color-1');
		
		buttonSets.addEventListener('click',() => Build.sets());

		const buttonsTalentsAndSets = document.createElement('div');
		buttonsTalentsAndSets.classList.add('buttons-talents-and-sets');
		buttonsTalentsAndSets.append(buttonTalents, separator, buttonSets);

		const buildTalents = document.createElement('div');
		buildTalents.classList.add('build-talents');

		Build.inventoryView = document.createElement('div');
		Build.inventoryView.classList.add('build-talent');

		const newSkin = DOM({
				tag: 'button',
				style: ['build-list-item', 'skins', 'btn-hover', 'color-3'],
				title: 'Образы на героя',
				event:['click', async () => Build.skinChange()]
			},
			'Скины'
		)

		Build.inventoryView.append(newSkin, buttonsTalentsAndSets, buildTalents);


		// ================================================

		Build.rarityView = document.createElement('div');
		
		Build.rarityView.classList.add('build-rarity');
		
		Build.activeBarView = document.createElement('div');
		
		Build.activeBarView.classList.add('build-active-bar');
		
		let request = await App.api.request('build','data',{heroId:heroId,target:targetId});
		
		Build.dataRequest = request;
		
		Build.id = request.id;
		
		Build.heroId = heroId;
		
		Build.dataStats = new Object();
		Build.calculationStats = new Object();
		Build.initialStats = new Object();
		Build.heroPower = 0.0;
		Build.heroStatsFromPower = {
			hp: 0.0,
			mp: 0.0,
			sila: 0.0,
			razum: 0.0,
			provorstvo: 0.0,
			hitrost: 0.0,
			stoikost: 0.0,
			volia: 0.0
		}
		Build.installedTalents = new Array(36).fill(null);
		Build.profileStats = new Object();

		Build.applyRz = true;
		Build.applyVz = false;
		Build.applyStak = true;
		Build.applyBuffs = true;
		
		Build.list(request.build);

		request.hero.stats['damage'] = 0;
		request.hero.stats['critProb'] = 0;
		request.hero.stats['attackSpeed'] = 0;
		request.hero.stats['punching'] = 0;
		request.hero.stats['protectionBody'] = 0;
		request.hero.stats['protectionSpirit'] = 0;
		Build.hero(request.hero);
		
		Build.level();
		
		Build.field(request.body);
		
		Build.inventory();
		
		Build.rarity();

		Build.activeBar(request.active);
		
		Build.ruleSortInventory = new Object();
		
	}
	
	static CleanInvalidDescriptions() {
		let invalidDescriptions = document.getElementsByClassName('build-description');
		for (let descElement in invalidDescriptions) {
			if (invalidDescriptions[descElement].className && invalidDescriptions[descElement].className == 'build-description') {
				console.log('Удалено протухшее описание');
				invalidDescriptions[descElement].remove();
			}
		}
	}
	
	static async sets(){
		
		let sets = await App.api.request('build','sets');
		
		for(let set of sets){
			
			console.log(set);
			
		}
		
	}

	static skinChange(){
		
		let bodyHero = DOM({style:'skin-change'});
		
		let preload = new PreloadImages(bodyHero);
		
		for(let i = 0; i < Build.dataRequest.hero.skin.total; i++){
			
			let hero = DOM();
			
			hero.dataset.url = `content/hero/${Build.heroId}/${(i + 1)}.webp`;
			
			hero.dataset.skin = (i + 1);
			
			hero.addEventListener('click', async () => {
				
				await App.api.request('build','skinChange',{hero:Build.heroId,skin:hero.dataset.skin});
				
				Build.heroImg.style.backgroundImage = `url(content/hero/${Build.heroId}/${hero.dataset.skin}.webp)`;
				
				Splash.hide();
				
			});
			
			preload.add(hero);
			
		}
		
		Splash.show(bodyHero,false);
		
	}
	
	static list(builds){

		const newRandomSkinsButtons = DOM({tag: 'div', style: 'new-random-skins-buttons--wrapper'});

		if(builds.length < 6){
			const close = DOM({tag: 'div', style: 'close', event: ['click', _ => {
				Splash.hide();
			}]}, '[x]');
			const create = DOM({tag: 'button', style: ['build-list-item', 'new-build', 'btn-hover', 'color-1'], title: 'Создать новую вкладку билда',  event:['click', () => {
					
				let template = document.createDocumentFragment();
				
				let name = DOM({tag:'input',placeholder:'Наименование билда'});
				
				let button = DOM({style:'splash-content-button',event:['click', async () => {
					
					if(!name.value){
						
						Splash.hide();
						
					}
					
					await App.api.request('build','create',{heroId:Build.heroId,name:name.value});
					
					Splash.hide();
					
					View.show('build',Build.heroId);
					
				}]},'Создать билд');
				
				template.append(name,button, close);
				
				Splash.show(template);
				
			}]});

			newRandomSkinsButtons.append(create);
		}

		const random = DOM({tag: 'button', style: ['build-list-item', 'random-build', 'btn-hover', 'color-1'], title: 'Сгенерировать случайный билд', event:['click', async () => {
			
			await App.api.request('build','random',{id:Build.id});
			
			View.show('build',Build.heroId);
			
		}]});
		newRandomSkinsButtons.append(random);

		const buildButtonsWrapper = DOM({style: 'build-buttons--wrapper'});
		buildButtonsWrapper.append(newRandomSkinsButtons)

		for(let build of builds){
			
			const item = DOM(
				{tag: 'button', style: ['build-list-item', 'btn-hover', 'color-2']},
				`${build.name}`,
			);

			const div = DOM({tag: 'div', style: 'button-build--wrapper'}, item);

			if (build.target) {
				div.classList.add('highlight');
			}

			item.onclick = () => {
				setTimeout(_ => {
					const _i = [...item.parentNode.parentNode.children].indexOf(item.parentNode);
					document.querySelectorAll('.button-build--wrapper')[_i-1].classList.add('highlight');
				}, 300);
				View.show('build',Build.heroId,build.id);
			}

			buildButtonsWrapper.append(div);

		}
		setTimeout(_ => {
			if (!document.querySelector('.button-build--wrapper.highlight')) {
				document.querySelector('.button-build--wrapper').classList.add('highlight');
			}
		}, 300);

		Build.listView.append(buildButtonsWrapper);

		Build.listView.append(DOM({style:'build-list-close', title: 'Закрыть', event:['click',() => {
			View.show('builds'); 
			Build.CleanInvalidDescriptions();
		}]},'[X]'));
	}

	static totalStat(stat){

		let initialStat = Build.initialStats[stat];
		let talentsStat = Build.calculationStats[stat];
		let powerStat = 0.0;
		if (stat in Build.heroStatsFromPower) {
			powerStat += Build.heroStatsFromPower[stat];
		}
		return initialStat + talentsStat + powerStat;
	}
	
	static hero(data){

		Build.heroStatMods = Build.dataRequest.hero.statModifiers;
		
		Build.heroPowerModifier = Build.dataRequest.hero.overallModifier;

		Build.heroPowerFromInstalledTalents = 0.0;

		Build.heroMainAttackStat = data.param; // osn_param
		Build.heroAttackModifier = data.koef; // aa_koef 
		
		for(let stat in data.stats){
			Build.initialStats[stat] = parseFloat(data.stats[stat]);
			Build.calculationStats[stat] = 0.0;
		}
		
		let stats = DOM({style:'build-hero-stats'});
		
		let template = {
			
			hp:'Здоровье',
			mp:'Энергия',
			speed:'Скорость',
			sila:'Сила',
			razum:'Разум',
			provorstvo:'Проворство',
			hitrost:'Хитрость',
			stoikost:'Стойкость',
			volia:'Воля',
			damage: 'Урон',
			critProb: 'Шанс крита',
			attackSpeed: 'Скорость атаки',
			punching: 'Пробивание',
			protectionBody: 'Защита тела',
			protectionSpirit: 'Защита духа',
			considerStacks: 'Учитывать стаки',
			considerBuff: 'Учитывать бафф',
			groundType: 'Учитывать землю',
		};
		
		if( !('profile' in Build.dataRequest) ){
			
			Build.dataRequest.profile = [0,0,0,0,0,0,0,0,0];
			
		}
		
		let i = 0;

		const cond = key =>
			['damage', 'critProb', 'attackSpeed', 'punching', 'protectionBody', 'protectionSpirit', 'considerStacks', 'considerBuff', 'groundType'].includes(key);
		
		for(const key in template){
			
			const item = DOM({style:'build-hero-stats-item',event:['click', !cond(key) ? () => {
				
				if(item.dataset.active == 1){
					
					item.style.background = 'rgba(0,0,0,0)';
					
					if(key == 'hp'){
						Build.removeSortInventory('stats','hp');
						Build.removeSortInventory('stats','krajahp');
						Build.removeSortInventory('stats','krajahprz');
						Build.removeSortInventory('stats','regenhpvz');
						Build.removeSortInventory('stats','krajahpvz');
						Build.removeSortInventory('stats','regenhp');
					}
					else if(key == 'mp'){
						Build.removeSortInventory('stats','mp');
						Build.removeSortInventory('stats','regenmp');
						Build.removeSortInventory('stats','krajamp');
						Build.removeSortInventory('stats','regenmpvz');
					}
					else if(key == 'speed'){
						Build.removeSortInventory('stats','speed');
						Build.removeSortInventory('stats','speedrz');
						Build.removeSortInventory('stats','speedvz');
					}
					else if(key == 'sila'){
						Build.removeSortInventory('stats','sila');
						Build.removeSortInventory('stats','sr');
						Build.removeSortInventory('stats','srsv');
						Build.removeSortInventory('stats','silarz');
						Build.removeSortInventory('stats','silavz');
					}
					else if(key == 'razum'){
						Build.removeSortInventory('stats','razum');
						Build.removeSortInventory('stats','sr');
						Build.removeSortInventory('stats','srsv');
						Build.removeSortInventory('stats','razumrz');
						Build.removeSortInventory('stats','razumvz');
					}
					else if(key == 'provorstvo'){
						Build.removeSortInventory('stats','provorstvo');
						Build.removeSortInventory('stats','ph');
						Build.removeSortInventory('stats','provorstvorz');
						Build.removeSortInventory('stats','provorstvovz');
						
					}
					else if(key == 'hitrost'){
						Build.removeSortInventory('stats','hitrost');
						Build.removeSortInventory('stats','ph');
						Build.removeSortInventory('stats','hitrostrz');
						Build.removeSortInventory('stats','hitrostvz');
						
					}
					else if(key == 'stoikost'){
						Build.removeSortInventory('stats','stoikost');
						Build.removeSortInventory('stats','sv');
						Build.removeSortInventory('stats','srsv');
						Build.removeSortInventory('stats','stoikostrz');
						Build.removeSortInventory('stats','svvz');
						Build.removeSortInventory('stats','vs');
					}
					else if(key == 'volia'){
						Build.removeSortInventory('stats','volia');
						Build.removeSortInventory('stats','sv');
						Build.removeSortInventory('stats','srsv');
						Build.removeSortInventory('stats','voliarz');
						Build.removeSortInventory('stats','svvz');
						Build.removeSortInventory('stats','vs');
					}
					Build.sortInventory();
					item.dataset.active = 0;
				} else {
					item.style.background = '#5899';
					if(key == 'hp'){
						Build.setSortInventory('stats','hp');
						Build.setSortInventory('stats','krajahp');
						Build.setSortInventory('stats','krajahprz');
						Build.setSortInventory('stats','regenhpvz');
						Build.setSortInventory('stats','krajahpvz');
						Build.setSortInventory('stats','regenhp');
					}
					else if(key == 'mp'){
						Build.setSortInventory('stats','mp');
						Build.setSortInventory('stats','regenmp');
						Build.setSortInventory('stats','krajamp');
						Build.setSortInventory('stats','regenmpvz');
					}
					else if(key == 'speed'){
						Build.setSortInventory('stats','speed');
						Build.setSortInventory('stats','speedrz');
						Build.setSortInventory('stats','speedvz');
					}
					else if(key == 'sila'){
						Build.setSortInventory('stats','sila');
						Build.setSortInventory('stats','sr');
						Build.setSortInventory('stats','srsv');
						Build.setSortInventory('stats','silarz');
						Build.setSortInventory('stats','silavz');
					}
					else if(key == 'razum'){
						Build.setSortInventory('stats','razum');
						Build.setSortInventory('stats','sr');
						Build.setSortInventory('stats','srsv');
						Build.setSortInventory('stats','razumrz');
						Build.setSortInventory('stats','razumvz');
					}
					else if(key == 'provorstvo'){
						Build.setSortInventory('stats','provorstvo');
						Build.setSortInventory('stats','ph');
						Build.setSortInventory('stats','provorstvorz');
						Build.setSortInventory('stats','provorstvovz');
					}
					else if(key == 'hitrost'){
						Build.setSortInventory('stats','hitrost');
						Build.setSortInventory('stats','ph');
						Build.setSortInventory('stats','hitrostrz');
						Build.setSortInventory('stats','hitrostvz');
					}
					else if(key == 'stoikost'){
						Build.setSortInventory('stats','stoikost');
						Build.setSortInventory('stats','sv');
						Build.setSortInventory('stats','srsv');
						Build.setSortInventory('stats','stoikostrz');
						Build.setSortInventory('stats','svvz');
						Build.setSortInventory('stats','vs');
					}
					else if(key == 'volia'){
						Build.setSortInventory('stats','volia');
						Build.setSortInventory('stats','sv');
						Build.setSortInventory('stats','srsv');
						Build.setSortInventory('stats','voliarz');
						Build.setSortInventory('stats','svvz');
						Build.setSortInventory('stats','vs');
					} else {
						Build.setSortInventory('stats',key);
					}
					// Build.setSortInventory('stats','hp');
					
					Build.sortInventory();
					item.dataset.active = 1;
					
				}
				
			} : null]},
				DOM({tag:'div'}, template[key]),
				DOM({tag:'div'}, data.stats[key] || 0)
			);

			if (key === 'groundType') {
				let isMouseOverItem = false;
				let isMouseOverWrapper = false;
				item.classList.add('noNumber');
				if (Build.applyRz || Build.applyVz) {
					item.classList.add('highlight');
				}
				let mouseOutEvent = function(){
					if (isMouseOverWrapper || isMouseOverItem) {
						return;
					}
					let wrapper = item.parentNode.querySelector('.wrapper');
					if (wrapper) {
						wrapper.remove();
					}
				}
				item.onclick = _ => {
					item.classList.toggle('highlight');
					let wrapper = item.parentNode.querySelector('.wrapper');
					if (Build.applyRz || Build.applyVz) {
						// Disable
						Build.applyRz = false;
						Build.applyVz = false;
						if (wrapper) {
							if (wrapper.querySelector('.home.highlight')) {
							}
							wrapper.querySelector('.home').classList.remove('highlight');
							if (wrapper.querySelector('.enemy.highlight')) {
							}
							wrapper.querySelector('.enemy').classList.remove('highlight');
						}
					} else {
						// Enable home
						Build.applyRz = true;
						Build.applyVz = false;
						if (wrapper) {
							wrapper.querySelector('.home').classList.add('highlight');
							if (wrapper.querySelector('.enemy.highlight')) {
								wrapper.querySelector('.enemy.highlight').classList.remove('highlight');
							}
						}
					}
					Build.updateHeroStats();
				}
				item.onmouseover = _ => {
					isMouseOverItem = true;
					if (item.parentNode.querySelector('.wrapper')) {
						// Node already here
						return;
					}
					const home = DOM({style: 'home'}, 'Родная');
					const enemy = DOM({style: 'enemy'}, 'Вражеская');
					if (Build.applyRz) {
						home.classList.add('highlight');
					} else if (Build.applyVz) {
						enemy.classList.add('highlight');
					}
					home.onclick = _ => {
						// Remove applicator if already selected
						if (home.classList.contains('highlight')) {
							home.classList.remove('highlight');
							item.classList.remove('highlight');
							Build.applyRz = false;
						} else {
							if (!item.classList.contains('.build-hero-stats-item.highlight')) {
								item.classList.add('highlight');
							}
							home.classList.add('highlight');
							enemy.classList.remove('highlight');
							Build.applyRz = true;
							Build.applyVz = false;
						}
						Build.updateHeroStats();
					}
					enemy.onclick = _ => {
						// Remove applicator if already selected
						if (enemy.classList.contains('highlight')) {
							enemy.classList.remove('highlight');
							item.classList.remove('highlight');
							Build.applyVz = false;
						} else {
							if (!item.classList.contains('.build-hero-stats-item.highlight')) {
								item.classList.add('highlight');
							}
							enemy.classList.add('highlight');
							home.classList.remove('highlight');
							Build.applyVz = true;
							Build.applyRz = false;
						}
						Build.updateHeroStats();
					}
					const wrapper = DOM({style: 'wrapper'}, home, enemy);
					wrapper.onmouseover = _ => {
						isMouseOverWrapper = true;
					}
					wrapper.onmouseout = _ => {
						isMouseOverWrapper = false;
						setTimeout(_ => {
							mouseOutEvent();
						}, 100)
					}
					item.parentNode.append(wrapper)
					
				}
				item.onmouseout = _ => {
					isMouseOverItem = false;
					setTimeout(_ => {
						mouseOutEvent();
					}, 100)
				}
			}

			if (key === 'considerStacks') {
				item.title = `Учитывание талантов, которые дают постепенную прибавку к определенному параметру Ваших характеристик
(например таланты оранжевого качества "Убийственная логика", Неудержимая сила")`
			}
			if (key === 'considerBuff') {
				item.title = `Учитывание талантов, которые действуют "на всех союзников/врагов" кратковременно или постоянно, активно или пассивно
(например таланты красного качества "Гимн решительности", Воодушевляющий гимн")`
			}
			if (key === 'groundType') {
				item.title = `Учитывание талантов, которые дают дополнительный баф от типа территории (земли) - родная, вражеская/нейтральная 
(например таланты красного качества "Оберег жизни", "Сияние естества")`
			}

			if (key === 'considerStacks' || key === 'considerBuff') {
				item.classList.add('noNumber');
				if (Build.applyStak && key === 'considerStacks') {
					item.classList.add('highlight');
				}
				if (Build.applyBuffs && key === 'considerBuff') {
					item.classList.add('highlight');
				}
				item.onclick = _ => {
					item.classList.toggle('highlight');
					if (key == 'considerStacks') {
						Build.applyStak = !Build.applyStak;
					} else if (key == 'considerBuff') {
						Build.applyBuffs = !Build.applyBuffs;
					}
					Build.updateHeroStats();
				}
			}
			
			item.dataset.active = 0;
			if (cond(key)) {
				item.classList.add('passive');
			}
			
			Build.dataStats[key] = item;
		
			if (!['hp', 'mp', 'speed', 'damage', 'critProb', 'attackSpeed', 'punching', 'protectionBody', 'protectionSpirit', 'considerStacks', 'considerBuff', 'groundType'].includes(key)) {
				const daw = DOM({tag: 'img', style:'build-hero-stats-daw', title: 'Сделать характеристику приоритетной', event:['click', async () => {
					
					if(daw.dataset.status != 0){
						
						await App.api.request('build','setProfile',{id:Build.id,index:daw.dataset.index,value:false});
						
						daw.dataset.status = 0;
						daw.src = 'content/icons/circle.webp';
						
						Build.profileStats[key] = 0;

						Build.updateHeroStats();
					}
					else{
						
						await App.api.request('build','setProfile',{id:Build.id,index:daw.dataset.index,value:true});
						
						daw.dataset.status = 1;
						daw.src = 'content/icons/checkbox.webp';
						
						Build.profileStats[key] = 1;

						Build.updateHeroStats();
					}
				}]});
				
				daw.dataset.index = i;
				
				daw.dataset.status = Build.dataRequest.profile[i];
				
				Build.profileStats[key] = parseInt(daw.dataset.status);
				
				if(daw.dataset.status == 1){
					daw.src = 'content/icons/checkbox.webp';
				} else {
					daw.src = 'content/icons/circle.webp';
				}
				
				stats.append(DOM({style:'build-hero-stats-line'}, daw, item));
			} else {
				stats.append(DOM({style:'build-hero-stats-line'}, item));
			}
			i++;
			
		}
		
		Build.heroName = DOM({tag: 'p', style: 'name'});
		
		if(MM.hero){
			
			Build.heroName.innerText = MM.hero.find(h => h.id === data.id).name;
			
		}

		Build.heroImg = DOM({style:'avatar'});
		
		if(App.isAdmin()){
			
			Build.heroImg.onclick = async () => {
				
				let body = document.createDocumentFragment(), request = await App.api.request('build','heroData',{id:data.id});
				
				for(let key in request){
					
					body.append(App.input((value) => {
						
						let object = new Object();
						
						object[key] = value;
						
						App.api.request('build','heroEdit',{id:data.id,object:object});
						
					},{value:request[key]}));
					
				}
				
				body.append(DOM({style:'splash-content-button',event:['click',() => Splash.hide()]},'Закрыть'));
				
				Splash.show(body);
				
			}
			
		}
		
		Build.heroImg.style.backgroundImage = `url(content/hero/${data.id}/${Build.dataRequest.hero.skin.target ? Build.dataRequest.hero.skin.target : 1}.webp)`;
		
		let rankIcon = DOM({style:'rank-icon'});
		
		rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(data.rating)}.webp)`;
		
		let rank = DOM({style:'rank'},DOM({style:'rank-lvl'},data.rating),rankIcon);
		
		Build.heroImg.append(rank);
		
		const wrapper = DOM({tag: 'div'},Build.heroImg,Build.heroName);
		
		Build.heroView.append(
			wrapper,
			stats
		);
		
	}

	static updateHeroStats(){
		Build.heroPower = 0.0;
		for(let key in Build.calculationStats)  {
			Build.calculationStats[key] = 0.0;
		}

		for(let i = 35; i >= 0; i--) {
			let talent = Build.installedTalents[i];
			if (talent) {
				Build.calcStatsFromPower(i);
				Build.setStat(talent, true, false);
			}
		}

		for(let key2 in Build.dataStats){
			
			Build.dataStats[key2].lastChild.innerText = Math.round(Build.totalStat(key2));
			
		}

		const statAg = Build.totalStat('provorstvo')
		const statCun = Build.totalStat('hitrost')
		const statStamina = Build.totalStat('stoikost');
		const statWill = Build.totalStat('volia');
		const statStrength = Build.totalStat('sila');
		const statInt = Build.totalStat('razum');

		{
			// TODO: make hero damage calculation
			let damage = Build.heroMainAttackStat == 1 ? statStrength : statInt;
			let dmgMin = Math.round(damage * Build.heroAttackModifier * 0.9);
			let dmgMax = Math.round(damage * Build.heroAttackModifier * 1.1);
			let dmgTag = Build.heroMainAttackStat == 1 ? '<fiz> </fiz>' : '<mag> </mag>';
			Build.dataStats['damage'].lastChild.innerHTML = dmgMin + '-' + dmgMax + dmgTag;
		}

		{
			let penetration = 0.0;
			if (statAg > 500.0) {
				penetration += 61.72 + 0.6876 * statAg - 10.035 * Math.sqrt(statAg);
			} else {
				penetration += 48.45 + 0.764 * statAg - 11.15 * Math.sqrt(statAg);
			}
			if (statCun > 500.0) {
				penetration += 85.78 + 0.43 * statCun - 15.55 * Math.log(statCun);
			} else {
				penetration += 59.83 + 0.57 * statCun - 20.73 * Math.log(statCun);
			}
			Build.dataStats['punching'].lastChild.innerText = Math.round(penetration) + '%';;
		}

		{
			let defStamina = 0.5355 * (statStamina + 0.3 * statWill) - 20;
			let defWill = 0.5355 * (statWill + 0.3 * statStamina) - 20;

			Build.dataStats['protectionBody'].lastChild.innerText = Math.round(defStamina) + '%';;
			Build.dataStats['protectionSpirit'].lastChild.innerText = Math.round(defWill) + '%';;
		}

		{
			let crit = 62.765 - 11534.0 / (126.04 + statCun);
			Build.dataStats['critProb'].lastChild.innerText = Math.max(0.0, Math.round(crit)) + '%';
		}

		{
			let attackSpeed = Math.min(2.0, 0.00364 * statAg + 0.49);
			Build.dataStats['attackSpeed'].lastChild.innerText = Math.round(attackSpeed * 100.0) / 100.0;
		}
	}

	static calcStatsFromPower(maxTalentId){
		const talentPowerByLine = {
			5: (33.0 / 600.0),
			4: (23.0 / 600.0),
			3: (16.0 / 600.0),
			2: (13.0 / 600.0),
			1: (9.0 / 600.0),
			0: (6.0 / 600.0)
		}

		Build.heroPowerFromInstalledTalents = 0.0;

		for(let i = 35; i >= 0 && i >= maxTalentId; i--) {
			let talent = Build.installedTalents[i];
			if (talent) {
				let line = Math.floor((35 - i) / 6);
				Build.heroPowerFromInstalledTalents += talentPowerByLine[line];
			}
		}

		for(let stat in Build.heroStatsFromPower){
			let Lvl = Build.heroStatMods[stat];
			let q = Build.heroPowerModifier;
			let m = Build.heroPower * Build.heroPowerFromInstalledTalents;
			Build.heroStatsFromPower[stat] = Lvl * (0.6 * q * (m / 10.0 - 16.0) + 36.0);
		}
	}

	static getMaxStat(stats){
		const fakeStat = 999;
		let maxStat = stats[0];
		let maxValue = Build.totalStat(maxStat);
		if (maxStat in Build.profileStats) {
			maxValue += Build.profileStats[maxStat] * fakeStat;
		} 

		for(let s = 1; s < stats.length; s++) {
			let possibleMaxStat = Build.totalStat(stats[s]);
			if (stats[s] in Build.profileStats) {
				possibleMaxStat += Build.profileStats[stats[s]] * fakeStat;
			} 
			if (possibleMaxStat > maxValue) {
				maxStat = stats[s];
				maxValue = Build.totalStat(maxStat);
				if (maxStat in Build.profileStats) {
					maxValue += Build.profileStats[maxStat] * fakeStat;
				} 
			}
		}

		return maxStat;
	}

	static getTalentRefineByRarity(rarity){
		return rarity ? Build.talentRefineByRarity[rarity] - 1.0 : 4.0;
	}
	
	static setStat(talent,fold = true,animation = true){

		// Calculate overall power bonus
		const talentPowerByRarity = {
			4: 68.952,
			3: 68.208,
			2: 69.12,
			1: 64.875,
			0: 90.2
		}

		let talentPower = 'rarity' in talent ? talentPowerByRarity[talent.rarity] : talentPowerByRarity[0];
		Build.heroPower += fold ? talentPower : -talentPower;

		let add = new Object();

		function registerStat(stat, key) {
			let statValue = parseFloat(talent.stats[key]);
			if ('statsRefine' in talent && 'rarity' in talent) {
				let refineBonus = Build.getTalentRefineByRarity(talent.rarity);
				let refineMul = parseFloat(talent.statsRefine[key]);
				statValue += refineBonus * refineMul;
			}
			add[stat] = statValue;
		}
		
		for(let key in talent.stats){
			
			if(key == 'sr'){
				registerStat(Build.getMaxStat(['sila', 'razum']), key)
			}
			else if(key == 'ph'){
				registerStat(Build.getMaxStat(['provorstvo', 'hitrost']), key)
			}
			else if(key == 'sv'){
				registerStat(Build.getMaxStat(['stoikost', 'volia']), key)
			}
			else if(key == 'srsv'){
				registerStat(Build.getMaxStat(['sila', 'razum', 'stoikost', 'volia']), key)
			}
			else{
				registerStat(key, key);
			}
			
		}

		function calcualteSpecialStats(keyStat, statChange) {
			if (keyStat in Build.calculationStats) {
				if (keyStat == 'speed') {
					Build.calculationStats[keyStat] = Math.max(Build.calculationStats[keyStat], statChange);
				} else {
					Build.calculationStats[keyStat] += fold ? statChange : -statChange;
				}
			}
		}
			
		// Apply animation and change stats in Build.calculationStats
		for(let key2 in add){
			
			let statChange = parseFloat(add[key2]);
			if (Build.applyStak && key2.indexOf('stak') != -1) {
				calcualteSpecialStats(key2.replace('stak', ''), statChange);
			} else
			if (Build.applyRz && key2.indexOf('rz') != -1) {
				calcualteSpecialStats(key2.replace('rz', ''), statChange);
			} else
			if (Build.applyVz && key2.indexOf('vz') != -1) {
				calcualteSpecialStats(key2.replace('vz', ''), statChange);
			} else
			if (key2.indexOf('dop') != -1) {
				calcualteSpecialStats(key2.replace('dop', ''), statChange);
			} else
			if (Build.applyBuffs && key2.indexOf('buff') != -1) {
				calcualteSpecialStats(key2.replace('buff', ''), statChange);
			} else {
				calcualteSpecialStats(key2, statChange);
			}
			
			if( !(key2 in Build.dataStats) ){
				
				continue;
				
			}
			
			if(animation){
				
				Build.dataStats[key2].animate({transform:['scale(1)','scale(1.5)','scale(1)']},{duration:250,fill:'both',easing:'ease-out'});
				
				Build.heroImg.animate({transform:['scale(1)','scale(1.5)','scale(1)']},{duration:250,fill:'both',easing:'ease-out'});
				
			}
			
		}
		
	}
	
	static level(){
		
		let i = 6;
		for(const number of ['VI','V','IV','III','II','I']){
			
			const item = document.createElement('div');
			
			item.innerText = number
			
			item.dataset.id = i;
			
			item.dataset.active = 0;
			
			item.id = `bl${i}`
			
			item.addEventListener('click', e => {
				
				if(item.dataset.active == 1){
					
					Build.removeSortInventory('level',item.dataset.id);
					
					Build.sortInventory();
					
					item.dataset.active = 0;
					
				} else {
					
					Build.setSortInventory('level',item.dataset.id);
					
					Build.sortInventory();
					
					item.dataset.active = 1;
					
				}

				e.target.classList.toggle('highlight');

				document.querySelector(`[data-level="${item.dataset['id']}"`).classList.toggle('highlight');
				
			});

			item.addEventListener('contextmenu', e => {
				e.preventDefault();
				
				for(const level of ["1", "2", "3", "4", "5", "6"]) {
					Build.removeSortInventory('level',level);
				}
				for (let l = 0; l < 6; l++) {
					item.parentElement.childNodes[l].dataset.active = 0;

					item.parentElement.childNodes[l].classList.remove('highlight');
					document.querySelector(`[data-level="${item.parentElement.childNodes[l].dataset['id']}"`).classList.remove('highlight');
				}
				Build.setSortInventory('level',item.dataset.id);
					
				Build.sortInventory();
					
				item.dataset.active = 1;
				
				document.querySelectorAll('.build-level div.highlight').forEach(n => n.click());
				item.classList.add('highlight');
				document.querySelector(`[data-level="${item.dataset['id']}"`).classList.add('highlight');
			});
			
			Build.levelView.append(item);
			
			i--;
			
		}
		
	}

	static talentStatFilter(stat) {
		return (
			stat.indexOf('stak') != -1 || 
			stat.indexOf('rz') != -1 || 
			stat.indexOf('vz') != -1 || 
			stat.indexOf('stak') != -1 || 
			stat.indexOf('dop') != -1 || 
			stat.indexOf('buff') != -1 || 
			(stat.indexOf('speed') != -1 && stat.indexOf('speedtal') == -1)
		);
	}
	
	static field(data){
		/*

		*/
		let y = 0, index = 0, level = 6, preload = new PreloadImages();
		
		while(y < 6){
			
			let row = document.createElement('div');
			
			row.classList.add('build-field-row');
			
			row.id = `bfr${level}`;
			
			row.dataset.level = level;
			
			let x = 0;
			
			while(x < 6){
				
				let item = document.createElement('div');
				
				item.dataset.position = index;
				
				item.classList.add('build-field-item');
				
				if(data[index]){
					
					data[index].state = 2;
					
					preload.add(Build.templateViewTalent(data[index]),item);
					
				}
				
				row.append(item);
				
				if(index == 0){
					
					item.style.borderRadius = '18px 0 18px 0';
					
				}
				else if([1,2,3,4].includes(index)){
					
					item.style.borderRadius = '0 0 18px 18px';
					
				}
				else if(index == 5){
					
					item.style.borderRadius = '0 18px 0 18px';
					
				}
				else if([11,17,23,29].includes(index)){
					
					item.style.borderRadius = '18px 0 0 18px';
					
				}
				else if(index == 35){
					
					item.style.borderRadius = '18px 0 18px 0';
					
				}
				else if([31,32,33,34].includes(index)){
					
					item.style.borderRadius = '18px 18px 0 0';
					
				}
				else if(index == 30){
					
					item.style.borderRadius = '0 18px 0 18px';
					
				}else if([6,12,18,24].includes(index)){
					
					item.style.borderRadius = '0 18px 18px 0';
					
				}else{
					
					item.style.borderRadius = '18px';
					
				}

				Build.installedTalents[index] = data[index];

				if (data[index] && 'conflict' in data[index]) {
					Build.fieldConflict[Math.abs(data[index].id)] = true;
				}
				
				x++;
				
				index++;
				
			}
			
			Build.fieldView.append(row);
			
			level--;
			
			y++;
		}

		Build.updateHeroStats();
		
	}
	
	static templateViewTalent(data){
		
		const talent = document.createElement('div');
		
		talent.classList.add('build-talent-item');

		if (data.txtNum) {
			let params = data.txtNum.split(';');
			if (!data.stats) {
				data.stats = new Object();
			}
			if (!data.statsRefine) {
				data.statsRefine = new Object();
			}
			for (let param in params) {
				let paramValues = params[param].split(',');
				if (Build.talentStatFilter(paramValues[2])) {
					data.stats[paramValues[2]] = parseFloat(paramValues[0]);
					data.statsRefine[paramValues[2]] = parseFloat(paramValues[1]);
				} else if (!(paramValues[2] in data.stats) && (paramValues[2] in Build.initialStats) && (Build.initialStats[paramValues[2]] > 0)) {
					data.stats[paramValues[2] + 'buff'] = parseFloat(paramValues[0]);
					data.statsRefine[paramValues[2] + 'buff'] = parseFloat(paramValues[1]);
				}
			}
		}

		data.params = data.txtNum ? data.txtNum : data.params; //"all,8,74,num,razum";
		
		Build.talents[data.id] = data;
		
		talent.dataset.id = data.id;

		talent.dataset.active = data.active;
		
		talent.dataset.state = data.state;
		
		talent.dataset.url = (data.id > 0) ? `content/talents/${data.id}.webp` : `content/htalents/${Math.abs(data.id)}.webp`;
		
		Build.move(talent);
		
		Build.description(talent);
		
		if (data.level == 0) {
			talent.style.display = 'none';
		}
		
		return talent;
		
		preload.add(talent);
	}
	
	static inventory(){
		
		let preload = new PreloadImages(Build.inventoryView.querySelector('.build-talents'));
		
		App.api.silent((data) => {
			
			for(let item of data){
				
				item.state = 1;
				
				preload.add(Build.templateViewTalent(item));
				
			}
			
		},'build','inventory',{buildId:Build.id});
		
	}
	
	static rarity(){
		
		const element = [
			{id:'4', name: 'Красное', color:'170,20,44'},
			{id:'3', name: 'Оранжевое', color:'237,129,5'},
			{id:'2', name: 'Фиолетовое', color:'205,0,205'},
			{id:'1', name: 'Синее', color:'17,105,237'}
		];
		
		let a = document.createElement('div');
		a.title = 'Активные таланты';
		
		a.classList.add('build-rarity-other');
		
		a.innerText = 'А';
		
		a.dataset.active = 0;
		
		a.onclick = () => {
			
			if(a.dataset.active == 1){
				
				a.style.background = 'rgba(255,255,255,0.1)';
				
				Build.removeSortInventory('active','1');
				
				Build.sortInventory();
				
				a.dataset.active = 0;
				
			}
			else{
				
				a.style.background = 'rgba(153,255,51,0.7)';
				
				Build.setSortInventory('active','1');
				
				Build.sortInventory();
				
				a.dataset.active = 1;
				
			}
			
		}
		
		Build.rarityView.append(a);
		
		for(let item of element){
			
			let button = document.createElement('div');
			
			button.dataset.active = 0;
			
			button.style.boxSizing = 'border-box'; 
			
			button.onclick = () => {
				
				if(button.dataset.active == 1){
					
					button.style.border = 'none';
					
					Build.removeSortInventory('rarity',item.id);
					
					Build.sortInventory();
					
					button.dataset.active = 0;
					
				}
				else{
					
					button.style.border = 'solid 7px rgb(153,255,51)';

					Build.setSortInventory('rarity',item.id);
					
					Build.sortInventory();
					
					button.dataset.active = 1;
					
				}
				
			}
			
			button.style.background = `rgba(${item.color},0.6)`;

			button.title = `${item.name} качество талантов`;
			
			Build.rarityView.append(button);
			
		}
		
		const reset = document.createElement('img');
		reset.title = 'Сбросить таланты в этом билде';
		reset.src = 'content/icons/trash.svg';
		reset.classList.add('reset');
		reset.addEventListener('click', async () => {
			const reset = DOM({event:['click', async () => {
				await App.api.request('build','clear',{id:Build.id});
				View.show('build',Build.heroId);
				Splash.hide();
			}]}, 'Сбросить')
			const close = DOM({event:['click',() => Splash.hide()]},'Отмена')
			const wrap = DOM({style: 'wrap'}, reset, close);
			const dom = DOM({style: 'div'}, 'Сбросить таланты в этом билде?', wrap);
			Splash.show(dom)
		});
		Build.rarityView.append(reset);
	}
	
	static activeBar(data){
		
		Build.activeBarItems = data;

		console.log('activeBar',data)
		let index = 0;
		
		for(let item of data){
			
			const element = DOM({data:{index:index},style:'build-active-bar-item',event:['click', async () => {
				
				if(element.dataset.active == 1){
					
					element.classList.remove('smartcast');
					
					element.dataset.active = 0;

					element.title = 'Смарткаст выключён';
				}
				else{
					
					element.classList.add('smartcast');
					
					element.dataset.active = 1;

					element.title = 'Смарткаст включён';
				}
				
				if(element.firstChild){
					
					let position = Number(element.firstChild.dataset.position) + 1;
					
					if(element.dataset.active == 1){
						
						position = -position;
						
					}
					
					await App.api.request('build','setActive',{buildId:Build.id,index:element.dataset.index,position:position});
					
				}
				
			}]});

			if(item >= 0){
				
				element.dataset.active = 0;
				
			}
			else{
				
				element.classList.add('smartcast');

				element.dataset.active = 1;
				
			}
			
			if(Math.abs(item)){
				
				let poistion = (Math.abs(item) - 1);
				
				let findTalent = Build.fieldView.querySelector(`[data-position = "${poistion}"]`);
				
				if( (findTalent) && (findTalent.firstChild) ){
					
				let clone = findTalent.firstChild.cloneNode(true);
				
				element.append(clone);
				
				clone.dataset.state = 3;
				
				clone.style.opacity = 1;
				
				clone.style.position = 'static';
				
				clone.style.backgroundImage = `url("${clone.dataset.url}")`;
				
				clone.dataset.position = poistion;
				
				clone.oncontextmenu = () => {
					
					try{
						
						App.api.request('build','setZeroActive',{buildId:Build.id,index:element.dataset.index});
						Build.activeBarItems[element.dataset.index] = 0;
						
						clone.remove();
						
						return false;
						
					}
					catch(e){
						
						
						
					}
					
					return false;
					
				}
					
					
				}
				

				
			}
			
			Build.activeBarView.append(element);
			
			index++;
			
		}

	}
	
	static setSortInventory(key,value){
		
		if( !(key in Build.ruleSortInventory) ){
			
			Build.ruleSortInventory[key] = new Array();
			
			Build.ruleSortInventory[key].push(value);
			
		}
		else{
			
			if(!Build.ruleSortInventory[key].includes(value)){
				
				Build.ruleSortInventory[key].push(value);
				
			}
			
		}
		
		// Build.sortInventory();
		
	}
	
	static removeSortInventory(key,value){
		
		if(key in Build.ruleSortInventory){
			
			let newArray = new Array();
			
			for(let item of Build.ruleSortInventory[key]){
				
				if(item != value){
					
					newArray.push(item);
					
				}
				
			}
			
			if(newArray.length){
				
				Build.ruleSortInventory[key] = newArray;
				
			}
			else{
				
				delete Build.ruleSortInventory[key];
				
			}
			
			// Build.sortInventory();
			
		}
		
	}
	
	static sortInventory(){
		
		for(let item of Build.inventoryView.querySelectorAll('.build-talent-item')){
			
			let data = Build.talents[item.dataset.id], flag = true;

			if (data.level == 0) {
				item.style.display = 'none';
				continue;
			}
			
			for(let key in Build.ruleSortInventory){
				
				if( !(key in data) ){
					
					flag = false;
					
					break;
					
				}
				
				if(key == 'stats'){
					
					let foundStat = false;
					
					if(!data.stats){
						
						flag = false;
						
						break;
						
					}
					
					for(let stat of Build.ruleSortInventory.stats){
						
						if( (stat in data.stats) ){
							
							foundStat = true;
							
						}
						
					}
					
					if(!foundStat){
						
						flag = false;
						
						break;
						
					}
					
				}
				else{
					
					if(!Build.ruleSortInventory[key].includes(`${data[key]}`)){
						
						flag = false;
						
						break;
						
					}
					
				}
				
			}
			
			if(flag){
				
				item.style.display = 'block';
				
			}
			else{
				
				item.style.display = 'none';
				
			}
			
		}
		
	}
	
	static cancelSortInventory(){
		
		Build.ruleSortInventory = new Object();
		
		for(let item of Build.inventoryView.children){
			
			item.style.display = 'block';
			
		}
		
	}
	
	static move(element){
		
		element.onmousedown = (event) => {

			let moveStart = Date.now();
			
			Build.descriptionView.style.display = 'none';
			
			let data = Build.talents[element.dataset.id];
			
			let fieldRow = document.getElementById(`bfr${data.level}`);
			
			fieldRow.style.background = 'rgba(255,255,255,0.5)';
			
			fieldRow.style.borderRadius = '15px';
			
			let shiftX = event.pageX - element.getBoundingClientRect().left;
			
			let shiftY = event.pageY - element.getBoundingClientRect().top;
			
			element.style.zIndex = 9999;
			
			element.style.position = 'absolute';
			
			element.style.left = event.pageX - shiftX - 5 + 'px';
			// Without "-5" onmouseup will not trigger - because mouse will be not on the node - if mousedown on top-left,
			// "mouseup event is released while the pointer is located inside" - from https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseup_event
			element.style.top = event.pageY - shiftY - 5 + 'px';

			element.style.display = 'none';
			let startingElementBelow = document.elementFromPoint(event.clientX, event.clientY);
			element.style.display = 'block';
			
			document.onmousemove = (e) => {
				
				element.style.left = e.pageX - shiftX - 5 + 'px';
				
				element.style.top = e.pageY - shiftY - 5 + 'px';
				
			}
			
			element.onmouseup = async (event) => {

				let moveEnd = Date.now();
				let isClick = moveEnd - moveStart < 200;
				
				document.onmousemove = null;
				
				element.onmouseup = null;
				
				let field = Build.fieldView.getBoundingClientRect();
				
				let inventory = Build.inventoryView.getBoundingClientRect();
				
				let bar = Build.activeBarView.getBoundingClientRect();
				
				let target = element.getBoundingClientRect();
				
				let left = parseInt(element.style.left) + (target.width / 2);
				
				let top = parseInt(element.style.top) + (target.height / 2);

				let isFieldTarget = (left > field.x) && (left < (field.x + field.width) ) && (top > field.y) && (top < (field.y + field.height) );

				let isInventoryTarget = (left > inventory.x) && (left < (inventory.x + inventory.width) ) && (top > inventory.y) && (top < (inventory.y + inventory.height) );

				let isActiveBarTarget = (left > bar.x) && (left < (bar.x + bar.width) ) && (top > bar.y) && (top < (bar.y + bar.height) );

				if (isClick && isFieldTarget) {
					element.style.display = 'none';
					let elemBelow = document.elementFromPoint(event.clientX, event.clientY);
					element.style.display = 'block';
					isClick = elemBelow == startingElementBelow;
				}

				if (isClick) {
					if (element.dataset.state == 2) {
						isFieldTarget = false;
						isInventoryTarget = true;
						isActiveBarTarget = false;
					}
					else if (element.dataset.state == 1 && data.level > 0) {
						let hasEmptySpace = false;
						for (let t = (data.level - 1) * 6; t < data.level * 6; t++) {
							if (!Build.installedTalents[35-t]) {
								hasEmptySpace = true;
								break;
							}
						}
						if (hasEmptySpace) {
							isFieldTarget = true;
							isInventoryTarget = false;
							isActiveBarTarget = false;
						}
					}
				}

				let removeFromActive = async (position) => {
					for (let i = 0; i < Build.activeBarItems.length; i++) {
						const talPos = Math.abs(Build.activeBarItems[i]) - 1;
						if (talPos == position) {
							Build.activeBarView.childNodes[i].firstChild.remove(); //.querySelector('build-talents')
							Build.activeBarItems[i] = 0;
							await App.api.request('build','setZeroActive',{buildId:Build.id,index:i});
						}
					}
				}
				
				if( isFieldTarget ){
					
					element.style.display = 'none';

					let elemBelow = document.elementFromPoint(event.clientX, event.clientY);

					if (elemBelow.childNodes[0] && elemBelow.childNodes[0].className == 'build-talent-item') {
						// Select 'build-talent-item' if selected its parent
						elemBelow = elemBelow.childNodes[0];
					}

					let swapParentNode = element.parentNode;
					let performSwap = false;
					let performSwapFromLibrary = false;

					if (elemBelow.className == 'build-talent-item' && elemBelow.parentElement.className == 'build-field-item') {
						elemBelow = elemBelow.parentElement;
						performSwap = swapParentNode.dataset.position ? true : false;
						performSwapFromLibrary = !performSwap;
					}
					
					if (isClick && data.level > 0) {
						let talentsInRow = document.getElementsByClassName('build-field-row')[6 - data.level].childNodes;
						for (let tal in talentsInRow) {
							if (talentsInRow[tal].childNodes.length == 0) {
								elemBelow = talentsInRow[tal];
								break;
							}
						}
					}
					
					element.style.display = 'block';
					
					if(elemBelow && (elemBelow.className == 'build-field-item') ){
						
						if( (data.level) && (elemBelow.parentNode.dataset.level == data.level) ){

							let conflictState = false;
								
							if ('conflict' in data) {
								for(let item of data.conflict){
									
									if(item in Build.fieldConflict){
										
										conflictState = true;
										
									}
									
								}
							}
							
							if(!conflictState){
								
								if ('conflict' in data) {
									Build.fieldConflict[Math.abs(data.id)] = true;
								}

								element.dataset.state = 2;
								
								let swappingTal = null;
								if (performSwap) {
									swappingTal = Build.installedTalents[parseInt(swapParentNode.dataset.position)];
									let swappedTal = Build.installedTalents[parseInt(elemBelow.dataset.position)];
									Build.installedTalents[parseInt(elemBelow.dataset.position)] = swappingTal;
									Build.installedTalents[parseInt(swapParentNode.dataset.position)] = swappedTal;
									
									swapParentNode.append(elemBelow.firstChild);
									elemBelow.append(element);
								} else {
									if (performSwapFromLibrary) {
										swappingTal = Build.installedTalents[parseInt(elemBelow.dataset.position)];
									}
									Build.installedTalents[parseInt(elemBelow.dataset.position)] = data;
									Build.installedTalents[parseInt(swapParentNode.dataset.position)] = null;

									if (performSwapFromLibrary) {
										swapParentNode.prepend(elemBelow.firstChild);
									}
									elemBelow.append(element);
								}
								
								try{
									if (data.active && swapParentNode.dataset.position) {
										await removeFromActive(swapParentNode.dataset.position);
									}
									if (performSwap) {
										let swappedTalent = Build.installedTalents[parseInt(swapParentNode.dataset.position)];
										
										if (swappedTalent.active) {
											await removeFromActive(elemBelow.dataset.position);
										}
										await App.api.request('build','setZero',{buildId:Build.id, index:swapParentNode.dataset.position});
										await App.api.request('build','set',{buildId:Build.id, talentId:swappedTalent.id, index:swapParentNode.dataset.position});
										
										Build.setStat(data, true, false);
									} else {
										if (performSwapFromLibrary) {
											if (swappingTal.active) {
												await removeFromActive(elemBelow.dataset.position);
											}
											await App.api.request('build','setZero',{buildId:Build.id, index:elemBelow.dataset.position});
										}
										Build.setStat(data, true);
									}
									
									await App.api.request('build','set',{buildId:Build.id,talentId:data.id,index:elemBelow.dataset.position});

							
									
								}catch(e){
									
									element.dataset.state = 1;
									
									Build.inventoryView.querySelector('build-talents').prepend(element);
									
									Build.installedTalents[parseInt(elemBelow.dataset.position)] = null;
									
								}

							}
							
						}
						
					}
					
				}
				else if( isInventoryTarget ){
					
					element.style.display = 'none';
					
					let elemBelow = document.elementFromPoint(event.clientX, event.clientY);
					
					if (isClick) {
						elemBelow = document.getElementsByClassName('build-talents')[0].firstChild;
					}
					
					element.style.display = 'block';
					
					if(elemBelow && (elemBelow.parentNode.className == 'build-talents') && (element.dataset.state != 1) ){
						
						let oldParentNode = element.parentNode;
						
						element.dataset.state = 1;
						
						elemBelow.parentNode.prepend(element);
						
						
						try{
							if (data.active && oldParentNode.dataset.position) {
								await removeFromActive(oldParentNode.dataset.position);
							}
							
							await App.api.request('build','setZero',{buildId:Build.id,index:oldParentNode.dataset.position});

							Build.installedTalents[parseInt(oldParentNode.dataset.position)] = null;
							
							Build.setStat(data,true);
							
							if(data.id < 0){
								
								delete Build.fieldConflict[Math.abs(data.id)];
								
							}
							
						}
						catch(e){
							
							element.dataset.state = 2;
							
							oldParentNode.append(element);
							
						}
						
					}
					
				}
				else if( isActiveBarTarget ){
					
					element.style.display = 'none';
					
					let elemBelow = document.elementFromPoint(event.clientX, event.clientY);
					
					element.style.display = 'block';
					
					if( (elemBelow) && (element.dataset.state == 2) && (elemBelow.className == 'build-active-bar-item') && (data.active == 1) ){
						
						let index = elemBelow.dataset.index;
						
						let active = elemBelow.dataset.active;
						
						let position = Number(element.parentNode.dataset.position) + 1;
						
						if(active == 1){
							
							position = -position;
							
						}
	
						try{
							
							await App.api.request('build','setActive',{buildId:Build.id,index:index,position:position});
							Build.activeBarItems[index] = position;
							
							let clone = element.cloneNode(true);
							
							clone.dataset.position = element.parentNode.dataset.position;
							
							clone.oncontextmenu = () => {
								
								try{
									
									App.api.request('build','setZeroActive',{buildId:Build.id,index:index});
									Build.activeBarItems[index] = null;
									
									clone.remove();
									
									return false;
									
								}
								catch(e){
									
									
									
								}
								
								return false;
								
							}
							
							clone.dataset.state = 3;
							
							elemBelow.append(clone);
							
							clone.style.opacity = 1;
							
							clone.style.position = 'static';
							
						}
						catch(e){
							
							
							
						}
						
					}
					
				}
				

				Build.updateHeroStats();
			
				fieldRow.style.background = '';

				element.style.position = 'static';
				
				element.style.zIndex = 'auto';
				
			}
			
		}
		
		element.ondragstart = () => {
			
			return false;
			
		};

	}
	
	static description(element){
		
		element.onmouseover = () => {
			
			let positionElement = element.getBoundingClientRect();
			
			let data = Build.talents[element.dataset.id];

			if (!data) {
				console.log("Не найден талант в билде: " + element.dataset.id)
				Build.descriptionView.style.display = 'none';
				return;
			}
			
			if( (!data.name) || (!data.description) ){
				
				Build.descriptionView.innerHTML = `<b>Талант #${data.id}</b><div>Информация отсутствует. Сообщите пожалуйста об этом в отдельную тему Telegram сообщества Prime World Classic.</div><span>+1000 Уважение</span>`;
				
			}
			else{
				
				let rgb = '';
				
				switch(data.rarity){
					
					case 1: rgb = '17,105,237'; break;
					
					case 2: rgb = '205,0,205'; break;
					
					case 3: rgb = '237,129,5'; break;
					
					case 4: rgb = '170,20,44'; break;
					
				}
				
				let stats = '';
				
				if( ('stats' in data) && (data.stats) ){
					
					for(let key in data.stats){
						if (Build.talentStatFilter(key)) {
							continue;
						}

						let statValue = parseFloat(data.stats[key]);
						
						if ('statsRefine' in data && 'rarity' in data) {
							let refineBonus = Build.getTalentRefineByRarity(data.rarity);
							let refineMul = parseFloat(data.statsRefine[key]);
							statValue += refineBonus * refineMul;
						}

						let sign = key == 'speedtal' || key == 'speedtalrz' || key == 'speedtalvz' ? '-' : '+';
						stats += sign +`${Math.floor(statValue * 10.0) / 10.0} ${(Build.language[key]) ? Build.language[key] : key}<br>`;
						
					}
					
				}
				Build.descriptionView.innerHTML = `<b style="color:rgb(${rgb})">${data.name}</b><div>${data.description}</div><span>${stats}</span>`;
				
				let innerChilds = Build.descriptionView.childNodes[1].childNodes;
				let paramIterator = 0;
				for (let outerTag of innerChilds) {
					for (let specialTag of outerTag.childNodes) {
						let tagString = specialTag.innerHTML ? specialTag.innerHTML : specialTag.data;
						if (!tagString || tagString.indexOf('%s') == -1 || !data.params) {
							continue;
						}
						let params = data.params.split(';');
						if (paramIterator >= params.length) {
							continue;
						}
						let param = params[paramIterator];
						let paramValues = param.split(',');

						let statAffection, minValue, maxValue;

						if (paramValues.length == 5) {
							//let applyTo = paramValues[0];
							minValue = parseFloat(paramValues[1]);
							maxValue = parseFloat(paramValues[2]);
							//let applicator = paramValues[3];
							statAffection = paramValues[4];
						}
						else if (paramValues.length == 3) {
							minValue = parseFloat(paramValues[0]);
							maxValue = parseFloat(paramValues[1]);
							statAffection = paramValues[2];
						}

						let resolvedStatAffection;
						switch (statAffection) {
							case 'sr_max':
								resolvedStatAffection = Build.getMaxStat(['sila', 'razum']);
								break;
							case 'sv_max':
								resolvedStatAffection = Build.getMaxStat(['stoikost', 'volia']);
								break;
							case 'ph_max':
								resolvedStatAffection = Build.getMaxStat(['provorstvo', 'hitrost']);
								break;
							default:
								resolvedStatAffection = statAffection;
								break;
						}

						function lerp(a, b, alpha) {
							return a + alpha * (b - a);
						}

						let outputString;
						if (resolvedStatAffection in Build.dataStats && paramValues.length == 5) {
							let resolvedTotalStat = Build.totalStat(resolvedStatAffection);
							const isHpOrEnergy = resolvedStatAffection == 'hp' || resolvedStatAffection == 'mp';
							const param1 = isHpOrEnergy ? 600.0 : 50.0;
							const param2 = isHpOrEnergy ? 6250.0 : 250.0;
							outputString = Math.round(lerp(minValue, maxValue, (resolvedTotalStat - param1) / param2));
						} else {
							let refineBonus = Build.getTalentRefineByRarity(data.rarity);
							outputString = Math.round(minValue + maxValue * refineBonus);
						}

						if (specialTag.innerHTML) {
							specialTag.innerHTML = tagString.replace('%s', outputString);
						} else {
							outerTag.innerHTML = tagString.replace('%s', outputString);
						}
						paramIterator++;
					}
				}
			}
			
			let positionDescription = Build.descriptionView.getBoundingClientRect();
			
			Build.descriptionView.style.zIndex = 9999;
			
			Build.descriptionView.style.position = 'absolute';
			
			Build.descriptionView.style.left = positionElement.left + 'px';
			
			Build.descriptionView.style.top = (positionElement.top + positionElement.height) + 'px';
			
			Build.descriptionView.style.display = 'block';
			
		}
		
		element.onmouseout = () => {
			
			Build.descriptionView.style.display = 'none';
			
		}
		
	}
	
}

class Events {
	
	static Message(data){
		
		let body = document.createDocumentFragment();

		body.append(DOM(`${data.message}`))
		
		Splash.show(body);
		
		setTimeout(() => Splash.hide(),3000);
		
	}
	
	static MMReady(data){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		// NativeAPI.attention();
		
		MM.ready(data);
		
	}
	
	static MMReadyCount(data){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		let find = document.getElementById('MMReady');
		
		if(find){
			
			find.innerText = `${data.count}/10`
			
		}
		
	}
	
	static MMStart(data){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		// NativeAPI.attention();
		
		MM.lobby(data);
		
	}
	
	static MMChangeHero(data){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		MM.eventChangeHero(data);
		
	}
	
	static MMChat(data){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		MM.chat(data);
		
	}
	
	static MMHero(data){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		MM.select(data);
		
	}
	
	static MMEnd(data){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		MM.finish(data);
		
	}
	
	static PInvite(data){
		
		let body = document.createDocumentFragment();
		
		let b1 = DOM({style:'splash-content-button',event:['click', async () => {
			
			await App.api.request('mmtest','joinParty',{code:data.code,version:PW_VERSION});
			
			Splash.hide();
			
		}]},'Принять');
		
		let b2 = DOM({style:'splash-content-button',event:['click',() => Splash.hide()]},'Отмена');
		
		body.append(DOM(`${data.nickname} приглашает вас в лобби`),b1,b2)
		
		Splash.show(body);
		
	}
	
	static PUpdate(data){
		
		View.show('castle',data);
		
	}
	
	static PHero(data){
		
		let find = document.getElementById(`PP${data.id}`);
		
		if(find){
			
			find.children[1].style.backgroundImage = (data.hero) ? `url(content/hero/${data.hero}/${data.skin ? data.skin : 1}.webp)` : `url(content/hero/empty.webp)`;
			
			find.children[1].firstChild.children[0].innerText = data.rating;
			
			find.children[1].firstChild.children[1].style.backgroundImage = `url(content/ranks/${Rank.icon(data.rating)}.webp)`;
			
		}
		
	}
	
	static PExit(){
		
		View.show('castle');
		
	}
	
	static PReady(data){
		
		let find = document.getElementById(`PP${data.id}`);
		
		if(find){
			
			find.children[2].innerText = 'Готов';
			
			find.children[2].classList.replace('party-middle-item-not-ready','party-middle-item-ready');
			
		}
		
	}
	
	static PMMActive(data){
		
		MM.searchActive(data.status);
		
	}

	static stat(data) {
		
		document.getElementById('STAT').innerText = `Онлайн: ${data.online}, Матчмейкинг (очередь): ${data.player}, Пати: ${data.party} | Prime World: Classic v.${PW_VERSION}.${APP_VERSION}`;
		
	}
	
	static MMKick(data){
		
		setTimeout(() => {
			
			MM.searchActive(false);
			
		},1000);
		
		let body = document.createDocumentFragment();
		
		let button = DOM({style:'splash-content-button',event:['click', async () => Splash.hide()]},'Больше так не буду');
		
		body.append(DOM(`${data.party ? 'Один из участников пати был АФК, поэтому вы исключены из подбора матча' : 'Вы были исключены из матчмейкинга за АФК!'}`),button);
		
		Splash.show(body);
		
	}
	
	static UChat(data){
		
		Chat.viewMessage(data);
		
	}

}

class App {
	
	static async init(){
		// ws://192.168.31.194:3737 // wss://playpw.fun:443/api/v1/ // ['wss://playpw.fun:443/api/v1/','wss://pw.26rus-game.ru:8443/']
		App.api = new Api(['wss://playpw.fun:443/api/v1/','wss://pw.26rus-game.ru:8443/'], Events);
		
		await Store.init();
		
		App.storage = new Store('u3');
		
		await App.storage.init({id:0,token:'',login:''});
		
		await Protect.init();
		
		await MM.init();
		
		Chat.init();
		
		await App.api.init();
		
		if(App.storage.data.login){
			
			try{
				
				View.show('castle');
				
			}
			catch(e){ // если ошибка, то вероятнее всего это session not valid для игрока, который получил бан. Поэтому надо заставить его заново пройти авторизацию, чтобы он увидел в лоб причину бана.
				
				App.exit();
				
			}
			
		}
		else{

			View.show('authorization');
			
		}
		
		// App.backgroundAnimate = document.body.animate({backgroundSize:['150%','100%','150%']},{duration:30000,iterations:Infinity,easing:'ease-out'});
		
		document.body.append(DOM({id:'STAT'}));
		
	}
	
	static async authorization(login,password){
		
		if(!login.value){
			
			login.setAttribute('style','background:rgba(255,0,0,0.3)');
			
			return App.error('Необходимо указать логин');
			
		}
		
		if(!password.value){
			
			password.setAttribute('style','background:rgba(255,0,0,0.3)');
			
			return App.error('Необходимо указать пароль');
			
		}
		
		let request;
		
		try{
			
			request = await App.api.request('user','authorization',{login:login.value.trim(),password:password.value.trim()});
			
		}
		catch(error){
			
			return App.error(error);
			
		}
		
		await App.storage.set({id:request.id,token:request.token,login:login.value,fraction:request.fraction});
		
		View.show('castle');
		
	}
	
	static async registration(fraction,invite,login,password,password2){
		
		if( (!fraction.value) || (!invite.value) || (!login.value) || (!password.value) || (!password2.value) ){
			
			return App.error('Не все значения указаны');
			
		}
		
		if(password.value != password2.value){
			
			password.setAttribute('style','background:rgba(255,0,0,0.3)');
			
			password2.setAttribute('style','background:rgba(255,0,0,0.3)');
			
			return App.error('Пароли не совпадают');
			
		}
		
		let request;
		
		try{
			
			request = await App.api.request('user','registration',{fraction:fraction.value,invite:invite.value.trim(),login:login.value.trim(),password:password.value.trim()});
			
		}
		catch(error){
			
			return App.error(error);
			
		}

		await App.storage.set({id:request.id,token:request.token,login:login.value,fraction:fraction.value});
		
		View.show('castle');
		
	}
	
	static async exit(){
		
		await App.storage.set({id:0,token:'',login:''});
		
		View.show('authorization');
		
	}
	
	static input(callback,object = new Object()){
		
		if(!('tag' in object)){
			
			object.tag = 'input';
			
		}
		
		if(!('value' in object)){
			
			object.value = '';
			
		}
		
		let body = DOM(object);
		
		body.addEventListener('blur', async () => {
			
			if(body.value == object.value){
				
				return;
				
			}
			
			if(callback){
				
				try{
					
					await callback(body.value);
					
				}
				catch(e){
					
					return;
					
				}
				
			}
			
			object.value = body.value;
			
		});
		
		return body;
		
	}
  
 	static getRandomInt(min,max){
		
		min = Math.ceil(min);
		
		max = Math.floor(max);
		
		return Math.floor(Math.random() * (max - min + 1)) + min;
		
	}
	
	static error(message){
		
		let body = DOM({style:'error-message'},DOM({tag:'div'},`${message}`));
		
		setTimeout(() => {
			
			body.remove();
			
		},3000);
		
		document.body.append(body);
		
	}
	
	static notify(message,delay = 0){
		
		setTimeout(() => {
			
			let body = DOM({style:'error-message'},DOM({tag:'div'},`${message}`));
			
			setTimeout(() => {
				
				body.remove();
				
			},3000);
			
			document.body.append(body);
			
		},delay);
		
	}
	
	static isAdmin(id = 0){
		
		return [1,2,24,134,865,2220].includes(Number((id ? id : App.storage.data.id)));
		
	}
	
	static href(url){
		
		let a = DOM({tag:'a',href:url});
		
		a.click();
		
	}
	
}

class Chat {
	
	static body;
	
	static hide = false;
	
	static to = 0;
	
	static init(){
		
		Chat.input = DOM({tag:'input',style:'chat-input',placeholder:'Введите текст и нажмите Enter'});
		
		Chat.body = DOM({style:'chat'},DOM({style:'chat-body'}),Chat.input);
		
		Chat.input.addEventListener('input',() => {
			
			if(!Chat.input.value){
				
				Chat.to = 0;
				
			}
			
		});
		
		Chat.input.addEventListener('keyup', async () => {
			
			if(event.code === 'Enter'){
				
				Chat.sendMessage();
				
			}
			
		});
		
		document.addEventListener('keydown', (event) => {
			
			if(event.code == 'KeyM' && (event.ctrlKey || event.metaKey)){
				
				if(Chat.hide){
					
					Chat.body.style.display = 'block';
					
					Chat.hide = false;
					
				}
				else{
					
					Chat.body.style.display = 'none';
					
					Chat.hide = true;
					
				}
				
			}
			
		});
		
	}
	
	static viewMessage(data){
		
		let nickname = DOM({tag:'div'},data.nickname);
		
		let message = DOM({tag:'div'});
		
		message.innerText = `${data.message}`;
		
		if(data.to == -1){
			
			message.style.color = 'rgb(255,50,0)';
			
			message.style.fontWeight = 600;
			
			message.style.fontStyle = 'italic';
			
		}
		else if(data.to == App.storage.data.id){
			
			message.style.color = 'rgba(51,255,0,0.9)';
			
		}
		
		if(data.id == 1){
			
			message.style.color = 'rgb(255,50,0)';
			
			message.style.fontWeight = 600;
			
		}
		else if(App.isAdmin(data.id)){
			
			message.style.color = 'transparent';
			
			message.style.fontWeight = 600;
			
			message.classList.add('animation-text');
			
		}
		
		let item = DOM({style:'chat-body-item',event:['click',() => {
			
			Chat.to = data.id;
			
			Chat.body.lastChild.value = `@${data.nickname}, `;
			
		}]},nickname,message);
		
		item.addEventListener('contextmenu',() => {
			
			if(App.isAdmin()){
				
				let body = document.createDocumentFragment();
				
				body.append(DOM(`Выдать мут чата ${data.nickname}?`),DOM({style:'splash-content-button',event:['click', async () => {
					
					await App.api.request('user','mute',{id:data.id});
					
					Splash.hide();
					
				}]},'Да'),DOM({style:'splash-content-button',event:['click', async () => Splash.hide()]},'Нет'));
				
				Splash.show(body);
				
			}
			
			return false;
			
		});
		
		Chat.body.firstChild.append(item);
		
		item.scrollIntoView({block:'end',behavior:'smooth'});
		
	}
	
	static async sendMessage(){
		
		if(Chat.input.value.length > 128){
			
			return;
			
		}
		
		await App.api.request('user','chat',{message:Chat.input.value,to:Chat.to});
		
		Chat.input.value = '';
		
	}
	
}

class HTTP {
	
	static async request(url,type = ''){
		
		let response = await fetch(url);
		
		switch(type){
			
			case 'text': return await response.text(); break;
			
			case 'arrayBuffer': return await response.arrayBuffer(); break;
			
			default: return await response.json(); break;
			
		}
		
	}
	
}

class PWGame {
	
	static PATH = '../Game/Bin/PW_Game.exe';
	
	static WORKING_DIR_PATH = '../Game/Bin/';
	
	static PATH_UPDATE = '../Tools/PW_NanoUpdater.exe';

	static gameServerHasConnection = false;

	static gameConnectionTestIsActive = false;

	static isUpToDate = false;

	static gameServerConnectionCheckTimeout = 1000 * 60 * 10; // 10 minutes
	
	static async start(id, callback){
		
		await PWGame.check();
		
		await NativeAPI.exec(PWGame.PATH, PWGame.WORKING_DIR_PATH, ['protocol',`pwclassic://runGame/${id}/${PW_VERSION}`], callback);
		
	}
	
	static async reconnect(id, callback){
		
		await PWGame.check();
		
		await NativeAPI.exec(PWGame.PATH, PWGame.WORKING_DIR_PATH, ['protocol',`pwclassic://reconnect/${id}/${PW_VERSION}`], callback);
		
	}
	
	static async check(){
		
		if(!NativeAPI.status){
			
			throw 'Необходима Windows версия лаунчера';
			
		}
		
		await NativeAPI.fileSystem.promises.access(PWGame.PATH);
		
	}

	static async checkUpdates() {
		if (!PWGame.isUpToDate) {
			throw 'Проверка обновления не завершена! Подождите';
		}
	}
	
	static async testGameServerConnection() {
		if (PWGame.gameServerHasConnection) {
			return;
		}
		const data = {
			method: 'checkConnection'
		};

		let gameServerIps = [
			'http://81.88.210.30:27302/api',
			'http://26.250.19.245:27302/api' // test connection to Radmin IP
		];

		for (let ip of gameServerIps) {
			try {
				let response = await fetch(ip, {
					method: "POST",
					body: JSON.stringify(data),
					headers: {
					"Content-type": "application/json; charset=UTF-8"
					}
				});

				PWGame.gameServerHasConnection = true;

				setTimeout(_ => {
					PWGame.gameServerHasConnection = false;
				}, PWGame.gameServerConnectionCheckTimeout);

				break;
			} catch (e) {
			};
		}
		if (!PWGame.gameServerHasConnection) {
			throw 'Игровой сервер недоступен!';
		}
	}
	
}

class NativeAPI {
	
	static status = false;
	
	static modules = {
		
		fileSystem:'fs',
		childProcess:'child_process',
		os:'os',
		path:'path',
		
	};
	
	static init(){
		
		try{
			
			if(!nw){
				
				return;
				
			}
			
		}
		catch(e){
			
			return;
			
		}
		
		NativeAPI.status = true;
		
		
		
		NativeAPI.app = nw.App;
		
		NativeAPI.window = nw.Window.get();
		
		NativeAPI.window.width = 1920;
		
		NativeAPI.window.height = 1080;
		
		NativeAPI.window.setMinimumSize(1280,720);
		
		NativeAPI.window.setResizable(true);
		
		NativeAPI.window.setPosition('center');
		
		NativeAPI.window.enterFullscreen();
		
		NativeAPI.app.registerGlobalHotKey(new nw.Shortcut({key:'Alt+Enter',active:() => NativeAPI.window.toggleFullscreen()}));
		
		NativeAPI.loadModules();
		
		window.addEventListener('error', (event) => NativeAPI.write('error.txt',event.error.toString()));
		
		window.addEventListener('unhandledrejection', (event) => NativeAPI.write('unhandledrejection.txt',event.reason.message));
		
	}
	
	static loadModules(){
		
		for(let module in NativeAPI.modules){
			
			NativeAPI[module] = require(NativeAPI.modules[module]);
			
		}
		
	}
	
	static async exec(exeFile, workingDir, args, callback){
		
		return new Promise((resolve,reject) => {
			
			if(!NativeAPI.status){
				
				reject();
				
			}
			
			let workingDirPath = NativeAPI.path.join(process.cwd(), workingDir), executablePath = NativeAPI.path.join(process.cwd(), exeFile);
			
			NativeAPI.childProcess.execFile(executablePath, args, { cwd: workingDirPath }, (error, stdout, stderr) => {
				
				if(error){
					
					reject(error);
					
				}
				
				resolve(stdout);
				
				if(callback){
					
					callback();
					
				}
				
			});
			
		});
		
	}
	
	static reset(){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		NativeAPI.app.clearCache();
		
		NativeAPI.window.reload();
		
	}
	
	static progress(value = 0.0){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		NativeAPI.window.setProgressBar(value);
		
	}
	
	static attention(){
		
		if(!NativeAPI.status){
			
			return;
			
		}
		
		NativeAPI.window.focus();
		
		NativeAPI.window.requestAttention(true);
		
	}
	
	static exit(){
		App.error('exit');
		if(!NativeAPI.status){
			
			return false;
			
		}
		
		NativeAPI.app.quit();
		
		return true;
		
	}
	
	static async update(callback){

		if(!NativeAPI.status){
			
			return false;
			
		}
		
		await NativeAPI.fileSystem.promises.access(PWGame.PATH_UPDATE);
		let spawn = NativeAPI.childProcess.spawn(PWGame.PATH_UPDATE), title = 'Проверка обновлений', updated = false, curLabel;

		App.notify('Проверка обновлений');

		spawn.stdout.on('data',(data) => {
			
			let progressDataElements = data.toString().substring(1).split('#');
			
			for(let progressDataElement of progressDataElements){
				
				let json = JSON.parse(progressDataElement);
				
				if(json.type){
					
					if(json.type == 'bar'){
						
						if (curLabel == 'content') {
							updated = true;
						}
						
						callback({update:true,title:title,total:Number(json.data)});
						
						NativeAPI.progress(Number(json.data) / 100);
						
					}
					else if(json.type == 'label'){
						
						switch(json.data){
							
							case 'game': title = 'Обновление игры'; curLabel = json.data; break;
							
							case 'content': title = 'Обновление лаунчера'; curLabel = json.data; break;
							
							case 'game_data0': title = 'Загрузка игровых архивов 1/8'; curLabel = json.data; break;
							case 'game_data1': title = 'Загрузка игровых архивов 2/8'; curLabel = json.data; break;
							case 'game_data2': title = 'Загрузка игровых архивов 3/8'; curLabel = json.data; break;
							case 'game_data3': title = 'Загрузка игровых архивов 4/8'; curLabel = json.data; break;
							case 'game_data4': title = 'Загрузка игровых архивов 5/8'; curLabel = json.data; break;
							case 'game_data5': title = 'Загрузка игровых архивов 6/8'; curLabel = json.data; break;
							case 'game_data6': title = 'Загрузка игровых архивов 7/8'; curLabel = json.data; break;
							case 'game_data7': title = 'Загрузка игровых архивов 8/8'; curLabel = json.data; break;

							default: title = 'Загрузка игровых архивов'; curLabel = json.data; break;
							
						}
						
					}
					else if(json.type == 'error'){
						App.error('Ошибка обновления: ' + json.data);
					}
					
				}
				
			}
			
		});
		
		spawn.on('close', (code) => {
			
			callback({update:false,title:'',total:0});
			
			NativeAPI.progress(-1);
			
			if( (code == 0) ){
				
				if (updated) {
					NativeAPI.reset();
				}
				PWGame.isUpToDate = true;

				App.notify('Обновление завершено');
			} else {
				App.notify('Обновление завершено с ошибкой: ' + code);
			}
			
		});
		
	}
	
	static analysis(){
		
		let username = '', cpus = NativeAPI.os.cpus();
		
		try{
			
			let userInfo = NativeAPI.os.userInfo();
			
			username = userInfo.username;
			
		}
		catch(error){
			
			
			
		}
		
		return {
			
			hostname:NativeAPI.os.hostname(),
			core:{model:(cpus.length ? cpus[0].model : ''),total:cpus.length},
			memory:( ( NativeAPI.os.totalmem() / 1024 ) / 1024 ),
			version:NativeAPI.os.version(),
			release:NativeAPI.os.release(),
			username:username
			
		};
		
	}
	
	static async write(file,body){
		
		await NativeAPI.fileSystem.promises.writeFile(file,body);
		
	}
	
}

class Castle {

	static canvas;
	
	static gl;

	static musicVolume = 0.5;

	static currentVolume = this.musicVolume;

	static render = true;
	
	static identityMatrix;
	
	static viewMatrix;
	
	static flipMatr;
	
	static viewMatrix2;
	
	static projMatrix;
	
	static viewProjMatr;
	
	static cursorBasis = new Float32Array(4);
	
	static cursorDeltaBasis = new Float32Array(4);
	
	static cursorBasis2 = new Float32Array(4);
	
	static viewProjInv = new Float32Array(16);
	
	static isSMEnabled;
	
	static isStaticSMCached = false;
	
	static lightViewProjMatrix;
	
	static depthTexture;
	
	static depthFramebuffer;
	
	static depthTextureSize = 8192;
	
	static zNear = 10.0;
	
	static zFar = 4500.0;
	
	static canvasWidth;
	
	static canvasHeight;
	
	static zNearSM = 0.1;
	
	static zFarSM = 1200.0;
	
	static zeroTranslation = [1072, 1360];
	
	static gridTranslation;
	
	static cursorPosition = [0, 0];
	
	static gridCursorPosX;
	
	static gridCursorPosZ;
	
	static minFov = 35;
	
	static maxFov = 55;
	
	static fixedFovValues = [45, 35, 55, 45];
	
	static fixedRotationTiltValues = [ 0, 0, -0.8, -0.9];
	
	static fixedCameraHeightValues = [ 0, 0, 350, 350];
	
	static initialFixedValue = 0.0;
	
	static currentFixedValue = 0.0;
	
	static targetFixedValue = 0.0;
	
	static cameraAnimationSpeed = 4.0;
	
	static fov = Castle.fixedFovValues[Math.floor(Castle.currentFixedValue)];
	
	static rotationTilt = Castle.fixedRotationTiltValues[Math.floor(Castle.currentFixedValue)];
	
	static cameraHeight = Castle.fixedCameraHeightValues[Math.floor(Castle.currentFixedValue)];
	
	static doMove = false;
	
	static cursorDeltaPos = [0.0, 0.0];
	
	static camDeltaPos = [0.0, 0.0];
	
	static camDeltaPosMinMax = [[-10, 10],[-10, 10]];
	
	static loadTime = Date.now();
	
	static currentTime = Date.now();
	
	static prevTime = Date.now();
	
	static deltaTime = 0;
	
	static doMove = false;
	
	static camDeltaPos = [0.0, 0.0];
	
	static camDeltaPosMinMax = [[-10, 10],[-10, 10]];
	
	static loadTime = Date.now();
	
	static currentTime = Date.now();
	
	static prevTime = Date.now();
	
	static deltaTime = 0;
	
	static scenesJson;
	
	static globalCanvas;

	static sceneObjects = [];

	static toggleMusic() {
		if (this.currentVolume == 0.0) {
			this.currentVolume = this.musicVolume;
		} else {
			this.currentVolume = 0.0;
		}
		Sound.setVolume('castle', this.currentVolume);
	}
	
	static zoom(event) {
		
		if (Math.abs(Castle.currentFixedValue - Castle.targetFixedValue) > 0.04) {
			// camera animation is not finished
			return;
			
		}
		// Reset
		Castle.currentFixedValue = Castle.targetFixedValue;
		
		Castle.initialFixedValue = Castle.currentFixedValue;
		// Setup new target
		Castle.targetFixedValue = Castle.currentFixedValue + (event.deltaY > 0 ? -1 : +1);
		
		Castle.targetFixedValue = Castle.clamp(Castle.targetFixedValue, 0, Castle.fixedFovValues.length - 1);
		
	}
	
	static prepareMove(event) {
		
		Castle.doMove = true;
		
	}
	
	static stopMove(event) {
		
		Castle.doMove = false;
		
	}
	
	static moveMouse(event) {
		
		if (Castle.doMove) {
			
			Castle.cursorDeltaPos[0] = event.movementX * 2.0;
			
			Castle.cursorDeltaPos[1] = event.movementY * 2.0;
			
		} else {
			
			Castle.cursorDeltaPos[0] = 0;
			
			Castle.cursorDeltaPos[1] = 0;
			
		}
		
		Castle.cursorPosition[0] = event.offsetX;
		
		Castle.cursorPosition[1] = event.offsetY;
		
	}
	
	static async initDemo(sceneName, canvas){
		
		window.addEventListener('resize', function(event) {
			
			canvas.width = document.body.offsetWidth;
			
			canvas.height = document.body.offsetHeight;
			
			Castle.canvasWidth = canvas.width;
			
			Castle.canvasHeight = canvas.height;
			
			Castle.cursorPosition = [Castle.canvasWidth, Castle.canvasHeight];
			
		}, true);
		
		Castle.globalCanvas = canvas;

		canvas.onwheel = Castle.zoom;

		//var canvas = document.getElementById('game-surface');

		canvas.width = document.body.offsetWidth;
		
		canvas.height = document.body.offsetHeight;

		canvas.onmousedown = Castle.prepareMove;
		
		canvas.onmouseup = Castle.stopMove;
		
		canvas.addEventListener('mousemove', Castle.moveMouse);

		Castle.gl = canvas.getContext('webgl');

		if (!Castle.gl) {
			console.log('WebGL not supported, falling back on experimental-webgl');
			Castle.gl = canvas.getContext('experimental-webgl');
		}

		if (!Castle.gl) {
			console.error('Your browser does not support WebGL');
			return 1;
		}

		Castle.gl.enable(Castle.gl.DEPTH_TEST);
		Castle.gl.enable(Castle.gl.CULL_FACE);
		Castle.gl.frontFace(Castle.gl.CCW);
		Castle.gl.cullFace(Castle.gl.FRONT);
		
		Castle.viewMatrix = new Float32Array(16);
		Castle.viewMatrix2 = new Float32Array(16);
		Castle.projMatrix = new Float32Array(16);
		Castle.viewProjMatr = new Float32Array(16);
		Castle.flipMatr = new Float32Array([
			-1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		]);
		Castle.canvasWidth = canvas.width;
		Castle.canvasHeight = canvas.height;
		Castle.cursorPosition = [Castle.canvasWidth, Castle.canvasHeight];
		
		
		Castle.isSMEnabled = true;
		
		const ext = Castle.gl.getExtension('WEBGL_depth_texture');
		
		if (!ext) {
			
			Castle.isSMEnabled = false;
			
		}
		
		if (Castle.isSMEnabled) {
			// Setup matrix. Only one viewProj is needed
			let lightViewMatrix = new Float32Array(16);
			let lightViewMatrix2 = new Float32Array(16);
			let lightProjMatrix = new Float32Array(16);
			Castle.lightViewProjMatrix = new Float32Array(16);
			mat4.ortho(lightProjMatrix, -400, 400, -400, 400, Castle.zNearSM, Castle.zFarSM);

			let smCamParams = [
				{
					name: 'ad',
					camPos: [-1239.6, -151, -1433],
					camRot: [-2.29, 2.813, 3.14]
				},
				{
					name: 'doct',
					camPos: [-1395.8, -291.7, -1338.5],
					camRot: [-2.4, -1.423, 3.14]
				}
			];

			let quatStart = quat.create();
			quat.identity(quatStart);
			let quatX = quat.create();
			let quatY = quat.create();
			let quatZ = quat.create();

			let smCam = smCamParams.find(value => value.name === sceneName);
			quat.rotateX(quatX, quatStart, smCam.camRot[0]);
			quat.rotateY(quatY, quatX, smCam.camRot[1]);
			quat.rotateZ(quatZ, quatY, smCam.camRot[2]);

			mat4.fromRotationTranslation(lightViewMatrix, quatZ, vec3.create());
			mat4.translate(lightViewMatrix, lightViewMatrix, smCam.camPos);
			mat4.multiply(lightViewMatrix2, Castle.flipMatr, lightViewMatrix);
			mat4.multiply(Castle.lightViewProjMatrix, lightProjMatrix, lightViewMatrix2);

			// Setup textures
			Castle.depthTexture = Castle.gl.createTexture();
			Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.depthTexture);
			Castle.gl.texImage2D(
				Castle.gl.TEXTURE_2D,      // target
				0,                  // mip level
				Castle.gl.DEPTH_COMPONENT, // internal format
				Castle.depthTextureSize,   // width
				Castle.depthTextureSize,   // height
				0,                  // border
				Castle.gl.DEPTH_COMPONENT, // format
				Castle.gl.UNSIGNED_INT,    // type
				null);              // data
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MAG_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MIN_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_S, Castle.gl.REPEAT);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_T, Castle.gl.REPEAT);

			Castle.depthFramebuffer = Castle.gl.createFramebuffer();
			Castle.gl.bindFramebuffer(Castle.gl.FRAMEBUFFER, Castle.depthFramebuffer);
			Castle.gl.framebufferTexture2D(
				Castle.gl.FRAMEBUFFER,       // target
				Castle.gl.DEPTH_ATTACHMENT,  // attachment point
				Castle.gl.TEXTURE_2D,        // texture target
				Castle.depthTexture,         // texture
				0);                   // mip level

			const unusedTexture = Castle.gl.createTexture();
			Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, unusedTexture);
			Castle.gl.texImage2D(
				Castle.gl.TEXTURE_2D,
				0,
				Castle.gl.RGBA,
				Castle.depthTextureSize,
				Castle.depthTextureSize,
				0,
				Castle.gl.RGBA,
				Castle.gl.UNSIGNED_BYTE,
				null,
			);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MAG_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MIN_FILTER, Castle.gl.NEAREST);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_S, Castle.gl.REPEAT);
			Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_T, Castle.gl.REPEAT);

			// attach it to the framebuffer
			Castle.gl.framebufferTexture2D(
				Castle.gl.FRAMEBUFFER,        // target
				Castle.gl.COLOR_ATTACHMENT0,  // attachment point
				Castle.gl.TEXTURE_2D,         // texture target
				unusedTexture,         // texture
				0);                  // mip level
		
		}
		
		let shaderNames = [], texNames = [], sceneBuildings = new Map, uniqShaderNames = [], uniqTexNames = [];

		let sceneMeshesToLoadCount = -1; // Initial value. Scene must have objects
		
		let result = await HTTP.request('content/scenes.json');
		
		Castle.scenesJson = result;
		
		Castle.currentScene = result.scenes.find(value => value.sceneName === sceneName);
		
		sceneMeshesToLoadCount = Castle.currentScene.objects.length + Castle.currentScene.buildings.length; // Set scene objects count to some valid value
		
		let loadedBuildings = [];
		
		loadedBuildings.push(Castle.currentScene.buildings);
		
		for(let obj of Castle.currentScene.objects) {
			
			Castle.sceneObjects.push({
				meshName: obj.mesh, meshData: {}, shader: obj.shader, shaderId: {}, blend: obj.blend,
				tintColor: obj.tintColor, uvScale: obj.uvScale, uvScroll: obj.uvScroll,
				texture: obj.texture, texture_2: obj.texture_2, texture_3: obj.texture_3, texture_4: obj.texture_4,
				textureId: {}, texture2Id: {}, texture3Id: {}, texture4Id: {}, strip: obj.strip, transform: obj.transform, indexCount: obj.indexCount
			});
			
			Castle.loadObjectResources(shaderNames,texNames,obj);
			
			sceneMeshesToLoadCount--; // Decrement after each loaded object
			
		}
		
		Castle.identityMatrix = new Float32Array(16);
		
		mat4.identity(Castle.identityMatrix);
		
		for(let building of Castle.currentScene.buildings) {
			
			let buildingTranslation = building.translation ? building.translation : [0, 0];
			
			for(let obj of building.objects){
				
				obj.transform[3] -= buildingTranslation[0];
				
				obj.transform[11] -= buildingTranslation[1];
				
				if (!sceneBuildings.has(building.name)) {
					
					sceneBuildings.set(building.name, {size: building.size, objects: [], transparentObjects: []});
					
				}
				
				let selectedContainer = obj.blend ? sceneBuildings.get(building.name).transparentObjects : sceneBuildings.get(building.name).objects;
				
				selectedContainer.push({
					meshName: obj.mesh, meshData: {}, shader: obj.shader, shaderId: {}, blend: obj.blend,
					tintColor: obj.tintColor, uvScale: obj.uvScale, uvScroll: obj.uvScroll,
					texture: obj.texture, texture_2: obj.texture_2, texture_3: obj.texture_3, texture_4: obj.texture_4,
					textureId: {}, texture2Id: {}, texture3Id: {}, texture4Id: {}, strip: obj.strip, transform: obj.transform, indexCount: obj.indexCount
				});
				
				Castle.loadObjectResources(shaderNames,texNames,obj);
				
			}
			
			sceneMeshesToLoadCount--;
			
		}








/*
	// Remove duplicates from content/shaders/textures. Associate object with its shader and texture by id
	async function waitLoadScene() {
		if (sceneMeshesToLoadCount == 0) {
			uniqShaderNames = [...new Set(shaderNames)];
			uniqTexNames = [...new Set(texNames)];

			function remapIndices(sceneObjectsContainer, objId) {
				sceneObjectsContainer[objId].shaderId = uniqShaderNames.findIndex(value => value === sceneObjectsContainer[objId].shader);
				sceneObjectsContainer[objId].textureId = uniqTexNames.findIndex(value => value === sceneObjectsContainer[objId].texture);
				sceneObjectsContainer[objId].texture2Id = uniqTexNames.findIndex(value => value === sceneObjectsContainer[objId].texture_2);
				sceneObjectsContainer[objId].texture3Id = uniqTexNames.findIndex(value => value === sceneObjectsContainer[objId].texture_3);
				sceneObjectsContainer[objId].texture4Id = uniqTexNames.findIndex(value => value === sceneObjectsContainer[objId].texture_4);
			}

			for (var objId = 0; objId < sceneObjects.length; objId++) {
				remapIndices(sceneObjects, objId);
			}
			sceneBuildings.forEach(function (value, key, map){
				var building = value.objects;
				for (objId = 0; objId < building.length; ++objId) {
					remapIndices(building, objId);
				}
				
				building = value.transparentObjects;
				for (objId = 0; objId < building.length; ++objId) {
					remapIndices(building, objId);
				}
			});

			let loadResources = await Castle.loadResources(sceneObjects, sceneBuildings, uniqShaderNames, uniqTexNames);
			
			//var canvas = globalCanvas; //document.getElementById('game-surface');
			Castle.globalCanvas.classList.add('castle-fade-in');
			let backgroundImage = document.getElementById('castle-background-img');
			backgroundImage.classList.add('castle-background-image-fade-out');
			Castle.MainLoop(sceneObjects, sceneBuildings, loadResources.shader, loadResources.texture);
			
			
			
			
			
			
			
		} else {
			window.setTimeout(waitLoadScene, 100);
		}
	}
*/

	/*	
	waitLoadScene();
	*/
	
	    await Castle.loadResources(Castle.sceneObjects, sceneBuildings, shaderNames, texNames);
		
		//var canvas = globalCanvas; //document.getElementById('game-surface');
		
		Castle.globalCanvas.classList.add('castle-fade-in');

		if (NativeAPI.fileSystem && !('castle' in Sound.all)) {
			var soundFiles = NativeAPI.fileSystem.readdirSync('content/sounds/' + sceneName);

			let selectMusic = function() {return 'content/sounds/' + sceneName + '/' + soundFiles[Math.floor(Math.random() * soundFiles.length)]}

			Sound.play(selectMusic(),{id:'castle',volume:Castle.musicVolume}, selectMusic);
		}
		
		let backgroundImage = document.getElementById('castle-background-img');
		
		backgroundImage.classList.add('castle-background-image-fade-out');
		
		Castle.MainLoop(Castle.sceneObjects, sceneBuildings, Castle.sceneShaders, Castle.sceneTextures);
		
	}
	
	static loadObjectResources(shaderNames,texNames,obj){
		
		shaderNames.push(obj.shader);
		
		texNames.push(obj.texture);
		
		if (obj.texture_2) {
			
			texNames.push(obj.texture_2);
			
		}
		
		if (obj.texture_3) {
			
			texNames.push(obj.texture_3);
			
		}
		
		if (obj.texture_4) {
			
			texNames.push(obj.texture_4);
			
		}
		
	}
	
	static async loadResources(sceneObjects,sceneBuildings,notUniqeShaderNames,notUniqeTexNames){
		let shaderNames = [...new Set(notUniqeShaderNames)];
		let texNames = [...new Set(notUniqeTexNames)];

		function remapIndices(sceneObjectsContainer, objId) {
			sceneObjectsContainer[objId].shaderId = shaderNames.findIndex(value => value === sceneObjectsContainer[objId].shader);
			sceneObjectsContainer[objId].textureId = texNames.findIndex(value => value === sceneObjectsContainer[objId].texture);
			sceneObjectsContainer[objId].texture2Id = texNames.findIndex(value => value === sceneObjectsContainer[objId].texture_2);
			sceneObjectsContainer[objId].texture3Id = texNames.findIndex(value => value === sceneObjectsContainer[objId].texture_3);
			sceneObjectsContainer[objId].texture4Id = texNames.findIndex(value => value === sceneObjectsContainer[objId].texture_4);
		}

		for (var objId = 0; objId < sceneObjects.length; objId++) {
			remapIndices(sceneObjects, objId);
		}
		sceneBuildings.forEach(function (value, key, map){
			var building = value.objects;
			for (objId = 0; objId < building.length; ++objId) {
				remapIndices(building, objId);
			}
			
			building = value.transparentObjects;
			for (objId = 0; objId < building.length; ++objId) {
				remapIndices(building, objId);
			}
		});
		
		Castle.sceneTextures = new Array(texNames.length);
		let loaded = {mesh:0,texture:0,shader:0};

		Castle.sceneShaders = new Array(shaderNames.length);

		let vsText = await HTTP.request(`content/shaders/shader.vs.glsl`,'text');
		
		let fsText = await HTTP.request(`content/shaders/shader.fs.glsl`,'text');
		
		for (let i = 0; i < shaderNames.length; ++i) {
			
			let definesText = await HTTP.request(`content/shaders/${shaderNames[i]}.glsl`,'text');
			
			let programColor = Castle.prepareShader("\n#define RENDER_PASS_COLOR\n",definesText,vsText,fsText);
			
			let programSM = Castle.prepareShader("\n#define RENDER_PASS_SM\n",definesText,vsText,fsText);
			
			Castle.sceneShaders[i] = { PSO: programColor, PSO_SM: programSM, attributes: Castle.scenesJson.shaderLayouts.find(value => value.name === shaderNames[i]).layout, vertStride: 0 };
			
			loaded.shader++;
			
		}
		
		for(let i = 0; i < texNames.length; ++i){
			
			Castle.sceneTextures[i] = Castle.loadTexture(await PreloadImages.loadAsync(`content/textures/${texNames[i]}.webp`));
			
			loaded.texture++;
			
		}
		
		for(let i = 0; i < sceneObjects.length; ++i){
			
			await Castle.loadMesh(shaderNames,sceneObjects,i);
			
			loaded.mesh++;
			
		}
		
		let totalMeshes = Castle.sceneObjects.length;
		
		for(let i = 0; i < sceneBuildings.length; ++i){
			
			let building = sceneBuildings[i].objects;
			
			for (let objId = 0; objId < building.length; ++objId) {
				
				await Castle.loadMesh(shaderNames,building,objId);
				
			}
			
			totalMeshes += building.length;
			
			building =  sceneBuildings[i].transparentObjects;
			
			for (let objId = 0; objId < building.length; ++objId) {
				
				await Castle.loadMesh(shaderNames,building,objId);
				
			}
			
			totalMeshes += building.length;
			
		}
		
	}
	
	static prepareShader(renderPassDefine,definesText,vsText,fsText){
		
		let vertexShader = Castle.gl.createShader(Castle.gl.VERTEX_SHADER), fragmentShader = Castle.gl.createShader(Castle.gl.FRAGMENT_SHADER);
		
		Castle.gl.shaderSource(vertexShader, definesText + renderPassDefine + vsText);
		
		Castle.gl.shaderSource(fragmentShader, definesText + renderPassDefine + fsText);
		
		Castle.gl.compileShader(vertexShader);
		
		if (!Castle.gl.getShaderParameter(vertexShader, Castle.gl.COMPILE_STATUS)) {
			
			console.error('ERROR compiling vertex shader!', Castle.gl.getShaderInfoLog(vertexShader));
			
			return 1;
			
		}
		
		Castle.gl.compileShader(fragmentShader);
		
		if (!Castle.gl.getShaderParameter(fragmentShader, Castle.gl.COMPILE_STATUS)) {
			
			console.error('ERROR compiling fragment shader!', Castle.gl.getShaderInfoLog(fragmentShader));
			
			return 1;
			
		}
		//console.log('Loaded shader ' + shaderNames[shaderId]);
		let program = Castle.gl.createProgram();
		
		Castle.gl.attachShader(program, vertexShader);
		
		Castle.gl.attachShader(program, fragmentShader);
		
		Castle.gl.linkProgram(program);
		
		if (!Castle.gl.getProgramParameter(program, Castle.gl.LINK_STATUS)) {
			
			console.error('ERROR linking program!', Castle.gl.getProgramInfoLog(program));
			
			return 1;
			
		}
		
		Castle.gl.validateProgram(program);
		
		if (!Castle.gl.getProgramParameter(program, Castle.gl.VALIDATE_STATUS)) {
			
			console.error('ERROR validating program!', Castle.gl.getProgramInfoLog(program));
			
			return 1;
			
		}
		
		return program;
		
	}

	static lerp( a, b, alpha ) {
		return a + alpha * ( b - a );
	}
	static clamp( val, min, max ) {
		return Math.min( Math.max( val, min ), max )
	}
	
	static loadTexture(image){
		
		let texture = Castle.gl.createTexture();
		
		Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, texture);
		
		Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_S, Castle.gl.REPEAT);
		
		Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_WRAP_T, Castle.gl.REPEAT);
		
		Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MIN_FILTER, Castle.gl.LINEAR);
		
		Castle.gl.texParameteri(Castle.gl.TEXTURE_2D, Castle.gl.TEXTURE_MAG_FILTER, Castle.gl.LINEAR);
		
		Castle.gl.texImage2D(Castle.gl.TEXTURE_2D, 0, Castle.gl.RGBA, Castle.gl.RGBA,Castle.gl.UNSIGNED_BYTE,image);
		
		Castle.gl.generateMipmap(Castle.gl.TEXTURE_2D);
		
		return texture;
		
	}
	
	static async loadMesh(shaderNames,sceneObjectsContainer, objectId){
		
		let meshData = await HTTP.request(`content/meshes/${sceneObjectsContainer[objectId].meshName}`,'arrayBuffer');
		
		let vertices = Castle.gl.createBuffer();
		
		let meshFloat = new Float32Array(meshData);
		
		Castle.gl.bindBuffer(Castle.gl.ARRAY_BUFFER, vertices);
		
		Castle.gl.bufferData(Castle.gl.ARRAY_BUFFER, meshFloat, Castle.gl.STATIC_DRAW);
		
		let attributes = Castle.scenesJson.shaderLayouts.find(value => value.name === shaderNames[sceneObjectsContainer[objectId].shaderId]).layout;
		
		let vertStride = 0;
		
		for (let attribute of attributes) {
			
			vertStride += attribute.count * attribute.sizeElem;
			
		}
		
		let indexCount = meshFloat.length / (vertStride / 4);
		
		if (indexCount != sceneObjectsContainer[objectId].indexCount) {
			
			console.error('Fatal error getting index count (' + meshName + ')');
			
		}
		
		sceneObjectsContainer[objectId].meshData = { vertices: vertices, vertStride: vertStride, indexCount: meshFloat.length / (vertStride / 4) };
		
		//console.log('Loaded mesh ' + meshName);
		
	}
	
	static MainLoop(sceneObjects,sceneBuildings,sceneShaders,sceneTextures){
		
		if (Castle.sceneBuildings) {
			var gridBuilding = Castle.sceneBuildings.get('grid');
			
			var gridTransform = gridBuilding.transparentObjects[0].transform;
			
			Castle.gridTranslation = [gridTransform[3], gridTransform[11]];

		} else {
			Castle.gridTranslation = [0, 0];
		}
		requestAnimationFrame(Castle.loop);
	}
	
	static loop(){

		if (!Castle.render) {
			requestAnimationFrame(Castle.loop);
			return;
		}
		
		Castle.prevTime = Castle.currentTime;
		
		Castle.currentTime = (Date.now() - Castle.loadTime) / 1000.0;
		
		Castle.deltaTime = Castle.currentTime - Castle.prevTime;

		// Update cam behaviour

		let factor = Castle.clamp(Castle.cameraAnimationSpeed * Castle.deltaTime, 0, 1);
		
		Castle.currentFixedValue = Castle.lerp(Castle.currentFixedValue, Castle.targetFixedValue, factor);

		let targetFovs = [Castle.fixedFovValues[Math.round(Castle.initialFixedValue)], Castle.fixedFovValues[Math.round(Castle.targetFixedValue)]];
		
		let targetRots = [Castle.fixedRotationTiltValues[Math.round(Castle.initialFixedValue)], Castle.fixedRotationTiltValues[Math.round(Castle.targetFixedValue)]];
		
		let targetCHVs = [Castle.fixedCameraHeightValues[Math.round(Castle.initialFixedValue)], Castle.fixedCameraHeightValues[Math.round(Castle.targetFixedValue)]];
		
		let camLerp = Math.abs(Castle.initialFixedValue - Castle.currentFixedValue);
		
		Castle.fov = Castle.lerp(targetFovs[0], targetFovs[1], camLerp);
		
		Castle.rotationTilt = Castle.lerp(targetRots[0], targetRots[1], camLerp);
		
		Castle.cameraHeight = Castle.lerp(targetCHVs[0], targetCHVs[1], camLerp);

		let buildings = [
			"grid",
			
			"crystal_farm",
			"food_farm",
			"heavy_farm",
			"light_farm",
			"silver_farm",
			"talent_farm",

			"clan_house",
			"fair",
			"house",
			"library",
			"storage",

			"agility",
			"cunning",
			"health",
			"intelligence",
			"strength",
			"tavern",

			"cat",
			"dog",
			"unicorn",
		];
		
		let buildingsToDraw = [];
		
		let buildingSelector = document.getElementsByClassName("buildings");
		
		let buildingRotation = document.getElementsByClassName("rotation");
		
		let buildingPositionX = document.getElementsByClassName("positionX");
		
		let buildingPositionZ = document.getElementsByClassName("positionZ");
		
		for (let i = 0; i < buildingSelector.length; ++i) {
			if (buildingSelector[i].checked) {
				var mesh = sceneBuildings.get(buildings[i]);
				buildingsToDraw.push({mesh: mesh, rotation: buildingRotation[i].value, 
					translation: [zeroTranslation[0] + (buildingPositionX[i].value * 7.0 + mesh.size[0] / 2.0 * 7.0), 1, zeroTranslation[1] + (buildingPositionZ[i].value * 7.0 + mesh.size[1] / 2.0 * 7.0)]});
			}
		}

		Castle.updateMainCam();
		
		if (Castle.isSMEnabled && !Castle.isStaticSMCached && Castle.sceneObjects) {
			Castle.isStaticSMCached = true;
			Castle.gl.bindFramebuffer(Castle.gl.FRAMEBUFFER, Castle.depthFramebuffer);
			Castle.gl.viewport(0, 0, Castle.depthTextureSize, Castle.depthTextureSize);
			Castle.gl.clear(Castle.gl.COLOR_BUFFER_BIT | Castle.gl.DEPTH_BUFFER_BIT);

			for (let i = 0; i < Castle.sceneObjects.length; ++i) {
				let obj = Castle.sceneObjects[i];
				if (obj.blend)
					break;
				Castle.prepareAndDrawObject(obj, true);
			}
			for (buildingToDraw of buildingsToDraw) {
				for (i = 0; i < buildingToDraw.mesh.objects.length; ++i) {
					PrepareAndDrawObject(buildingToDraw.mesh.objects[i], true, buildingToDraw.rotation, buildingToDraw.translation);
				}
			}

		}

		Castle.gl.bindFramebuffer(Castle.gl.FRAMEBUFFER, null);
		Castle.gl.viewport(0, 0, Castle.gl.canvas.width, Castle.gl.canvas.height);
		Castle.gl.clearColor(0.75, 0.85, 0.8, 1.0);
		Castle.gl.clear(Castle.gl.COLOR_BUFFER_BIT | Castle.gl.DEPTH_BUFFER_BIT);
		for (buildingToDraw of buildingsToDraw) {
			for (i = 0; i < buildingToDraw.mesh.objects.length; ++i) {
				Castle.prepareAndDrawObject(buildingToDraw.mesh.objects[i], false, buildingToDraw.rotation, buildingToDraw.translation);
			}
		}
		if (Castle.sceneObjects) {
			for (let i = 0; i < Castle.sceneObjects.length; ++i) {
				Castle.prepareAndDrawObject(Castle.sceneObjects[i], false);
			}
			for (buildingToDraw of buildingsToDraw) {
				for (i = 0; i < buildingToDraw.mesh.transparentObjects.length; ++i) {
					Castle.prepareAndDrawObject(buildingToDraw.mesh.transparentObjects[i], false, buildingToDraw.rotation, buildingToDraw.translation);
				}
			}
		}
		Castle.gl.disable(Castle.gl.BLEND);
		Castle.gl.enable(Castle.gl.CULL_FACE);
		Castle.gl.colorMask(true, true, true, true);
		Castle.gl.depthMask(true);

		Castle.cursorDeltaPos[0] = 0;
		Castle.cursorDeltaPos[1] = 0;

		requestAnimationFrame(Castle.loop);
		
	}
	
	static prepareAndDrawObject(obj, isSMPass, rotation, translation) {
		
		let meshData = obj.meshData;
		let associatedTexture = obj.textureId;
		let associatedTexture2 = obj.texture2Id;
		let associatedTexture3 = obj.texture3Id;
		let associatedTexture4 = obj.texture4Id;
		let associatedShader = Castle.sceneShaders[obj.shaderId];

		let textures = [Castle.sceneTextures[associatedTexture], 
			associatedTexture2 ? Castle.sceneTextures[associatedTexture2] : {}, 
			associatedTexture3 ? Castle.sceneTextures[associatedTexture3] : {}, 
			associatedTexture4 ? Castle.sceneTextures[associatedTexture4] : {}];
		let uvScroll = [0.0, 0.0];
		
		if (obj.uvScroll) {
			uvScroll[0] = obj.uvScroll[0] * Castle.currentTime;
			uvScroll[1] = obj.uvScroll[1] * Castle.currentTime;
		}
		
		Castle.drawObject(isSMPass ? associatedShader.PSO_SM : associatedShader.PSO, 
			textures,meshData.vertices, meshData.indexCount, 
			meshData.vertStride, Castle.sceneShaders[obj.shaderId].attributes, 
			obj.strip, obj.transform, isSMPass, 
			obj.blend, obj.tintColor, obj.uvScale, uvScroll, rotation, translation);
		
	}
	
	static updateMainCam(){
		
		mat4.perspective(Castle.projMatrix, glMatrix.toRadian(Castle.fov), Castle.canvasWidth / Castle.canvasHeight, Castle.zNear, Castle.zFar);
		
		var camPosElements = [-1432, -440, -1582];
		
		var camPosX = camPosElements[0] + Castle.camDeltaPos[0];
		
		var camPosY = camPosElements[2] - Castle.camDeltaPos[1];
		
		var camPosZ = camPosElements[1] + Castle.cameraHeight;
		
		var camPos = vec3.fromValues(camPosX, camPosZ, camPosY);
		
		var camForwElements = [-2.170, -2.36, 3.14];
		
		var quatStart = quat.create();
		
		quat.identity(quatStart);
		
		var quatX = quat.create();
		
		var quatY = quat.create();
		
		var quatZ = quat.create();
		
		quat.rotateX(quatX, quatStart, camForwElements[0] + Castle.rotationTilt);
		
		quat.rotateY(quatY, quatX, camForwElements[1]);
		
		quat.rotateZ(quatZ, quatY, camForwElements[2]);
		
		mat4.fromRotationTranslation(Castle.viewMatrix, quatZ, vec3.create());
		
		mat4.translate(Castle.viewMatrix, Castle.viewMatrix, camPos);
		
		mat4.multiply(Castle.viewMatrix2, Castle.flipMatr, Castle.viewMatrix);
		
		mat4.multiply(Castle.viewProjMatr, Castle.projMatrix, Castle.viewMatrix2);
		
		var camForw = [Castle.viewMatrix2[2], Castle.viewMatrix2[6], Castle.viewMatrix2[10], 0];
		
		var camForwXY = [camForw[0], camForw[2]];
		
		vec2.normalize(camForwXY, camForwXY);
		
		var camRight = [Castle.viewMatrix2[0], Castle.viewMatrix2[4], Castle.viewMatrix2[8], 0];
		
		var camRightXY = [camRight[0], camRight[2]];
		
		vec2.normalize(camRightXY, camRightXY);
		
		Castle.camDeltaPos[0] -= (camForwXY[1] * Castle.cursorDeltaPos[0] - camRightXY[1] * Castle.cursorDeltaPos[1]) * 0.1;
		
		Castle.camDeltaPos[1] -= (camForwXY[0] * Castle.cursorDeltaPos[0] - camRightXY[0] * Castle.cursorDeltaPos[1]) * 0.1;
		
		Castle.camDeltaPos[0] = Castle.clamp(Castle.camDeltaPos[0], Castle.camDeltaPosMinMax[0][0], Castle.camDeltaPosMinMax[0][1]);
		
		Castle.camDeltaPos[1] = Castle.clamp(Castle.camDeltaPos[1], Castle.camDeltaPosMinMax[1][0], Castle.camDeltaPosMinMax[1][1]);
		
		mat4.invert(Castle.viewProjInv, Castle.viewProjMatr); // viewProj -> world
		
		Castle.cursorBasis = [((Castle.cursorPosition[0] - Castle.canvasWidth / 2) / Castle.canvasWidth * 2), -((Castle.cursorPosition[1] - Castle.canvasHeight / 2) / Castle.canvasHeight * 2), 1, 1];
		
		vec4.transformMat4(Castle.cursorBasis2, Castle.cursorBasis, Castle.viewProjInv);
		
		Castle.cursorBasis2[0] /= -Castle.cursorBasis2[3];
		
		Castle.cursorBasis2[1] /= -Castle.cursorBasis2[3];
		
		Castle.cursorBasis2[2] /= -Castle.cursorBasis2[3];
		
		var camForwNew = [Castle.cursorBasis2[0] - camPos[0], Castle.cursorBasis2[1] - camPos[1], Castle.cursorBasis2[2] - camPos[2]];
		
		vec3.normalize(camForwNew, camForwNew);
		
		var t = -(camPos[1] + 27) / camForwNew[1];
		
		Castle.gridCursorPosX = camPos[0] + t * camForwNew[0] + (Castle.zeroTranslation[0] + Castle.gridTranslation[0]);
		
		Castle.gridCursorPosZ = camPos[2] + t * camForwNew[2] + (Castle.zeroTranslation[1] + Castle.gridTranslation[1]);
		
	}
	
	static setupMainCam(program){
		
		let matViewProjUniformLocation = Castle.gl.getUniformLocation(program, 'mViewProj');
		
		Castle.gl.uniformMatrix4fv(matViewProjUniformLocation, Castle.gl.FALSE, Castle.viewProjMatr);
		
		let matViewProjSMUniformLocation = Castle.gl.getUniformLocation(program, 'lightViewProj');
		
		Castle.gl.uniformMatrix4fv(matViewProjSMUniformLocation, Castle.gl.FALSE, Castle.lightViewProjMatrix);
		
		let zNearFar = Castle.gl.getUniformLocation(program, 'zNear_zFar');
		
		Castle.gl.uniform4f(zNearFar, Castle.zNear, Castle.zFar, Castle.zNearSM, Castle.zFarSM);
		
		let cursorGridPosition = Castle.gl.getUniformLocation(program, 'cursorGridPosition');
		
		Castle.gl.uniform2f(cursorGridPosition, -Castle.gridCursorPosX, -Castle.gridCursorPosZ);
		
	}
	
	static setupSMCam(program){
		
		let matViewProjUniformLocation = Castle.gl.getUniformLocation(program, 'mViewProj');
		
		Castle.gl.uniformMatrix4fv(matViewProjUniformLocation, Castle.gl.FALSE, Castle.lightViewProjMatrix);
		
	}
	
	static getBlendFunc(blendString){
		
		switch(blendString){
			
			case "ZERO": return Castle.gl.ZERO; break;
			
			case "ONE": return Castle.gl.ONE; break;
			
			case "SRC_COLOR": return Castle.gl.SRC_COLOR; break;
			
			case "ONE_MINUS_SRC_COLOR": return Castle.gl.ONE_MINUS_SRC_COLOR; break;
			
			case "DST_COLOR": return Castle.gl.DST_COLOR; break;
			
			case "ONE_MINUS_DST_COLOR": return Castle.gl.ONE_MINUS_DST_COLOR; break;
			
			case "SRC_ALPHA": return Castle.gl.SRC_ALPHA; break;
			
			case "ONE_MINUS_SRC_ALPHA": return Castle.gl.ONE_MINUS_SRC_ALPHA; break;
			
			case "DST_ALPHA": return Castle.gl.DST_ALPHA; break;
			
			case "ONE_MINUS_DST_ALPHA": return Castle.gl.ONE_MINUS_DST_ALPHA; break;
			
			case "CONSTANT_COLOR": return Castle.gl.CONSTANT_COLOR; break;
			
			case "ONE_MINUS_CONSTANT_COLOR": return Castle.gl.ONE_MINUS_CONSTANT_COLOR; break;
			
			case "CONSTANT_ALPHA": return Castle.gl.CONSTANT_ALPHA; break;
			
			case "ONE_MINUS_CONSTANT_ALPHA": return Castle.gl.ONE_MINUS_CONSTANT_ALPHA; break;
			
			case "SRC_ALPHA_SATURATE": return Castle.gl.SRC_ALPHA_SATURATE; break;
			
			default: return Castle.gl.ONE; break;
			
		}
		
	}
	
	static drawObject(program,textures,vertices,indexCount,vertStride,attributes,strip,transform,isSMPass,blend,tintColor,uvScale,uvScroll,rotation,translation){
		
		if(blend){
			
			Castle.gl.enable(Castle.gl.BLEND);
			
			Castle.gl.disable(Castle.gl.CULL_FACE);
			
			Castle.gl.blendEquation(Castle.gl.FUNC_ADD);
			
			Castle.gl.colorMask(true, true, true, false);
			
			Castle.gl.depthMask(false);
			
			Castle.gl.blendFunc(Castle.getBlendFunc(blend[0]),Castle.getBlendFunc(blend[1]));
			
		}
		
		Castle.gl.bindBuffer(Castle.gl.ARRAY_BUFFER,vertices);
		
		let attribOffset = 0;
		
		for(let attribute of attributes){
			
			let attribLocation = Castle.gl.getAttribLocation(program, attribute.name);
			
			let attribType = attribute.sizeElem == 4 ? Castle.gl.FLOAT : (attribute.sizeElem == 2 ? Castle.gl.UNSIGNED_SHORT : Castle.gl.UNSIGNED_BYTE);
			
			Castle.gl.vertexAttribPointer(
			attribLocation, // Attribute location
			attribute.count, // Number of elements per attribute
			attribType, // Type of elements
			Castle.gl.TRUE,
			vertStride, // Size of an individual vertex
			attribOffset // Offset from the beginning of a single vertex to this attribute
			);
			
			Castle.gl.enableVertexAttribArray(attribLocation);
			
			attribOffset += attribute.count * attribute.sizeElem;
			
		}
		
		Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, null);
		// Tell OpenGL state machine which program should be active.
		Castle.gl.useProgram(program);
		
		isSMPass ? Castle.setupSMCam(program) : Castle.setupMainCam(program);
		
		let tintColorValue = tintColor ? tintColor : [1, 1, 1, 1];
		
		let tintColorLocation = Castle.gl.getUniformLocation(program, 'tintColor');
		
		Castle.gl.uniform4fv(tintColorLocation, tintColorValue);
		
		let uvScaleValue = uvScale ? uvScale : [1, 1, 1, 1];
		
		let uvScaleLocation = Castle.gl.getUniformLocation(program, 'uvScale');
		
		Castle.gl.uniform4fv(uvScaleLocation, uvScaleValue);
		
		if (uvScroll[0] > 0) {
			
			let e = 1;
			
		}
		
		let uvScrollValue = uvScroll ? uvScroll : [0, 0];
		
		let uvScrollLocation = Castle.gl.getUniformLocation(program, 'uvScroll');
		
		Castle.gl.uniform2fv(uvScrollLocation, uvScrollValue);
		
		let worldMatrix = transform ? transform : new Float32Array([
		1, 0, 0, 0,
		0, 0, 1, 0,
		0, -1, 0, 0,
		0, 0, 0, 1
		]);
		
		var worldMatrix2 = new Float32Array(16);
		
		var worldMatrix3 = new Float32Array(16);
		
		mat4.transpose(worldMatrix2, worldMatrix);
		
		mat4.fromRotation(worldMatrix3, rotation, [0, 1, 0]);
		
		if(rotation){
			
			mat4.mul(worldMatrix2, worldMatrix3, worldMatrix2);
			
		}
		
		if(translation){
			
			worldMatrix2[12] += translation[0];
			
			worldMatrix2[13] += translation[1];
			
			worldMatrix2[14] += translation[2];
			
		}
		
		let matWorldUniformLocation = Castle.gl.getUniformLocation(program, 'mWorld');
		
		Castle.gl.uniformMatrix4fv(matWorldUniformLocation, Castle.gl.FALSE, worldMatrix2);
		
		for (let i = 0; i < textures.length; ++i) {
			
			if (textures[i]) {
				
				Castle.gl.activeTexture(Castle.gl.TEXTURE0 + i);
				
				Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, textures[i]);
				
				let attribName = "tex" + i;
				
				let texLocation = Castle.gl.getUniformLocation(program, attribName);
				
				Castle.gl.uniform1i(texLocation, i);
				
			}
			
		}
		
		if (!isSMPass) {
			
			Castle.gl.activeTexture(Castle.gl.TEXTURE0 + textures.length);
			
			Castle.gl.bindTexture(Castle.gl.TEXTURE_2D, Castle.depthTexture);
			
			let attribNameSM = "smTexture";
			
			let texLocationSM = Castle.gl.getUniformLocation(program, attribNameSM);
			
			Castle.gl.uniform1i(texLocationSM, textures.length);
			
		}
		
		Castle.gl.drawArrays(strip ? Castle.gl.TRIANGLE_STRIP : Castle.gl.TRIANGLES, 0, indexCount);
		
	}
	
	static lerp(a,b,alpha){
		
		return a + alpha * ( b - a );
		
	}
	
	static clamp(val,min,max) {
		
		return Math.min(Math.max(val,min ),max);
		
	}
	
}

class Protect {
	
	static async init(){
		
		Protect.storage = new Store('p');
		
		await Protect.storage.init({c:'',v:PW_VERSION,s:false});
		
	}
	
	static async checkInstall(){
		
		if(!Protect.storage.data.s){
			
			if(Protect.storage.data.c){
				
				let request = await App.api.request('mmtest','check',{id:Protect.storage.data.c});
				
				if(request){
					
					if(request == Protect.storage.data.c){
						
						await Protect.storage.set({v:PW_VERSION,s:true});
						
						return true;
						
					}
					
				}
				
			}
			else{
				
				let c = Date.now();
				
				await Protect.storage.set({c:c});
				
				await App.api.request('mmtest','check',{id:c});
				
			}
			
			let launch = DOM({tag:'a',href:`pwclassic://checkInstall/${App.storage.data.token}/${PW_VERSION}`});
			
			launch.click();
			
			return false;
			
		}
		
		if(Protect.storage.data.v != PW_VERSION){
			
			await Protect.storage.set({c:'',s:false});
			
			return false;
			
		}
		
		return true;
		
	}
	
}

class MM {
	
	static id = '';
	
	static hero = false;
	
	static view = document.createElement('div');
	
	static button = document.createElement('div');
	
	static active = false;
	
	static targetPlayerAnimate = false;
	
	static activeSelectHero = 0;
	
	static gameRunEvent(){
		Sound.pause('castle');
	}

	static gameStopEvent(){
		Sound.unpause('castle');
	}
	
	static async init(){
		
		MM.view.classList.add('mm');
		
		MM.view.style.display = 'none';
		
		document.body.append(MM.view);
		
		MM.button.innerText = 'В бой!';
		
		MM.button.onclick = () => MM.start();
		
		Timer.init();
		
		window.addEventListener('beforeunload',() => {
			
			if(NativeAPI.status){
				
				if(MM.active){
					
					MM.start();
					
				}
				
			}
			
		});
		
	}
	
	static soundEvent(){
		
		let audio = new Audio();
		
		audio.preload = 'auto';
		
		audio.src = 'content/sounds/found.ogg';
		
		audio.play();
		
	}
	
	static play(){
		
		return MM.button;
		
	}
	
	static show(content){
		
		if(MM.view.firstChild){
			
			while(MM.view.firstChild){
				
				MM.view.firstChild.remove();
				
			}
			
		}
		
		MM.view.append(content);
		
		MM.view.style.display = 'flex';
		
	}
	
	static close(){
		
		Sound.stop('tambur');

		Sound.setVolume('castle', Castle.musicVolume);
		
		MM.view.style.display = 'none';
		
	}
	
	static searchActive(status = true){
		
		if( (status) && (!MM.active) ){
			
			MM.active = true;
			
			MM.buttonAnimate = MM.button.animate({opacity:[1,0.5,1]},{duration:1000,iterations:Infinity,easing:'ease-out'});
			
			MM.button.innerText = 'Поиск боя';
			
		}
		
		if( (!status) && (MM.active) ){
			
			MM.active = false;
			
			if(MM.buttonAnimate){
				
				MM.buttonAnimate.cancel();
				
			}
			
			MM.button.innerText = 'В бой!';
			
		}	
		
	}
	
	static async start(){
		
		if(NativeAPI.status){
			if (PWGame.gameConnectionTestIsActive) {
				return;
			}
			if (!PWGame.gameServerHasConnection || !PWGame.isUpToDate) {
				MM.button.innerText = 'Проверка';
			}
			
			try{
				
				if (!MM.active) {
					PWGame.gameConnectionTestIsActive = true;

					await PWGame.check();

					await PWGame.testGameServerConnection();

					await PWGame.checkUpdates();

					PWGame.gameConnectionTestIsActive = false;
				}
				
			}
			catch(error){
				PWGame.gameConnectionTestIsActive = false;
				
				if (!PWGame.gameServerHasConnection || !PWGame.isUpToDate) { // Неудача
					MM.button.innerText = 'В бой!';
				}
				
				return App.error(error);
				
			}
			
		}
		else{
			/*
			if(!await Protect.checkInstall()){
				
				MM.button.innerText = 'Проверка';
				
				setTimeout(() => {
					
					MM.button.innerText = 'В бой!';
					
				},5000);
				
				
				
			}
			*/
			
			Splash.show(DOM({tag:'div'},`Поиск боя возможен с Windows версии лаунчера!`));
			
			return;
			
		}
		
		if(!MM.hero){
			
			MM.hero = await App.api.request('build','heroAll');
			
		}
		
		if(MM.active){
			
			try{
				
				MM.id = await App.api.request('mmtest','cancel');
				
			}
			catch(error){
				
				return App.error(error);
				
			}
			
			MM.searchActive(false);
			
		}
		else{
			
			MM.searchActive(true);
			
			try{
				
				let request = await App.api.request('mmtest','start',{hero:MM.activeSelectHero,version:PW_VERSION});
				
				MM.id = request.id;
				
				if(request.type == 'reconnect'){
					
					MM.searchActive(false);

					MM.gameRunEvent();
					
					PWGame.reconnect(request.id, MM.gameStopEvent);
					
					return;
					
				}
				
			}
			catch(error){
				
				MM.searchActive(false);
				
				return App.error(error);
				
			}
			
		}
		
	}
	
	static async cancel(){
		
		await App.api.request('mmtest','start');
		
		MM.id = '';
		
	}
	
	static async ready(data){
		
		MM.id = data.id;
		
		let body = DOM({style:'mm-ready'},Timer.body,DOM({id:`MMReady`,style:'mm-ready-count'},`0/10`));
		
		await Timer.start(data.id,'Бой найден',() => {
			
			MM.close();
			
			MM.searchActive(true);
			
		});
		
		MM.searchActive(false);
		
		MM.soundEvent();
		
		let button = DOM({style:'ready-button',event:['click', async () => {
			
			try{
				
				await App.api.request('mmtest','ready',{id:MM.id});
				
			}
			catch(error){
				
				Timer.stop();
				
				MM.close();
				
				MM.searchActive(false);
				
				return;
				
			}
			
			button.style.opacity = 0;
			
		}]},'Готов!');
		
		
		button.style.fontSize = '2vw';
		
		button.animate({transform:['scale(1)','scale(0.8)','scale(1.2)','scale(1)']},{duration:500,iterations:Infinity,easing:'ease-in-out'});
		
		body.append(button);
		
		MM.show(body);
		
	}
	
	static async lobbyBuildView(heroId){
		
		if(MM.lobbyBuildField.firstChild){
			
			MM.lobbyBuildField.firstChild.remove();
			
		}
		
		while(MM.lobbyBuildTab.firstChild){
			
			MM.lobbyBuildTab.firstChild.remove();
			
		}
		
		let builds = await App.api.request('build','my',{hero:heroId});
		
		for(let build of builds){
			
			let tab = DOM({event:['click', async () => {
				
				await App.api.request('build','target',{id:build.id});
				
				for(let child of MM.lobbyBuildTab.children){
					
					child.style.background = 'rgba(255,255,255,0)';
					
				}
				
				tab.style.background = 'rgba(255,255,255,0.3)';
				
				if(MM.lobbyBuildField.firstChild){
					
					MM.lobbyBuildField.firstChild.remove();
					
				}
				
				MM.lobbyBuildField.append(Build.viewModel(build.body,false,false));
				
			}]},build.name);
			
			if(build.target){
				
				tab.style.background = 'rgba(255,255,255,0.3)';
				
				if(MM.lobbyBuildField.firstChild){
					
					MM.lobbyBuildField.firstChild.remove();
					
				}
				
				MM.lobbyBuildField.append(Build.viewModel(build.body,false,false));
				
			}
			
			MM.lobbyBuildTab.append(tab);
			
		}
		
	}
	
	static async lobby(data){
		
		if(!MM.hero){
			
			MM.hero = await App.api.request('build','heroAll');
			
		}
		
		if(!MM.id){
			
			MM.id = data.id;
			
		}
		
		MM.searchActive(false);
		
		MM.lobbyUsers = data.users;
		
		MM.targetHeroId = data.users[App.storage.data.id].hero;
		
		let lobbyBuild = DOM({style:'mm-lobby-middle-build'});
		
		MM.lobbyBuildField = DOM();
		
		MM.lobbyBuildField.style.margin = '0.5vw 0';
		
		MM.lobbyBuildField.style.width = '25vw';
		
		MM.lobbyBuildField.style.height = '25vw';
		
		MM.lobbyBuildTab = DOM({style:'lobby-build-tab'});
		
		MM.lobbyConfirm = DOM({style:'ready-button',event:['click', async () => {
			
			try{
				
				await App.api.request('mmtest','hero',{id:MM.id,heroId:MM.targetHeroId});
				
			}
			catch(error){
				
				MM.lobbyConfirm.innerText = error;
				
				setTimeout(() => {
					
					MM.lobbyConfirm.innerText = 'Подтвердить';
					
				},1500);
				
			}
			
		}]},'Подтвердить');
		
		MM.lobbyConfirm.style.opacity = 0;
		
		MM.lobbyConfirm.style.width = '50%';
		
		MM.lobbyConfirm.animate({transform:['scale(1)','scale(0.8)','scale(1.2)','scale(1)']},{duration:2000,iterations:Infinity,easing:'ease-in-out'});
		
		lobbyBuild.append(MM.lobbyConfirm,MM.lobbyBuildField,MM.lobbyBuildTab);
		
		if(MM.targetHeroId){
			
			MM.lobbyBuildView(MM.targetHeroId);
			
		}
		
		let leftTeam = DOM({style:'mm-lobby-header-team'});
		
		let rightTeam = DOM({style:'mm-lobby-header-team'});
		
		for(let key of data.map){
			
			let player = DOM({id:`PLAYER${key}`,style:'mm-lobby-header-team-player'});
			
			player.dataset.hero = data.users[key].hero;
			
			let hero = DOM({style:'mm-lobby-header-team-player-hero'});
			
			let name = DOM({style:'mm-lobby-header-team-player-name'},`${data.users[key].nickname}`);
			
			let rankIcon = DOM({style:'rank-icon'});
			
			rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(data.users[key].rating)}.webp)`;
			
			let rank = DOM({style:'rank'},DOM({style:'rank-lvl'},data.users[key].rating),rankIcon);
			
			hero.append(rank);
			
			hero.style.backgroundImage = (data.users[key].hero) ? `url(content/hero/${data.users[key].hero}/1.webp)` : `url(content/hero/empty.webp)`;
			
			player.append(hero,name);
			
			if(key == data.target) {
				
				MM.lobbyPlayerAnimate = player.animate({transform:['scale(1)','scale(0.8)','scale(1.1)','scale(1)']},{duration:2000,iterations:Infinity,easing:'ease-in-out'});
				
			}
			
			if(data.users[App.storage.data.id].team == data.users[key].team){
				
				leftTeam.append(player);
				
				player.onclick = () => {
					
					if(player.dataset.hero){
						
						Build.view(key,player.dataset.hero,data.users[key].nickname,false);
						
					}
					
				}
				
			}
			else{
				
				name.innerText = 'Анонимус';
				
				name.style.opacity = 0;
				
				rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(1100)}.webp)`;
				
				rank.firstChild.innerText = 1100;
				
				rank.style.opacity = 0;
				
				rightTeam.append(player);
				
			}
			
		}
		
		MM.lobbyHeroes = DOM({style:'mm-lobby-middle-hero'});
		
		let preload = new PreloadImages(MM.lobbyHeroes);
		
		for(let item of MM.hero){
			
			let hero = DOM({id:`HERO${item.id}`,data:{ban:0}});

			hero.dataset.url = `content/hero/${item.id}/1.webp`;
			
			hero.onclick = async () => {
				
				MM.targetHeroId = item.id;
				
				await App.api.request('mmtest','eventChangeHero',{id:MM.id,heroId:item.id});
				
				MM.lobbyBuildView(MM.targetHeroId);
				
			}
			
			let rankIcon = DOM({style:'rank-icon'});
			
			rankIcon.style.backgroundImage = `url(content/ranks/${Rank.icon(item.rating)}.webp)`;
			
			let rank = DOM({style:'rank'},rankIcon);
			
			hero.append(rank);
			
			preload.add(hero);
			
		}
		
		
		if(App.storage.data.id == data.target){
			
			MM.lobbyConfirm.style.opacity = 1;
			
		}
		
		let info = DOM({style:'lobby-timer'});
		
		await Timer.start(data.id,'',() => {
			
			MM.close();
			
			MM.searchActive(true);
			
		});
		
		info.append(Timer.body);
		
		MM.chatBody = DOM({style:'mm-lobby-middle-chat-body'});
		
		let chatInput = DOM({tag:'input',style:'mm-lobby-middle-chat-button',placeholder:'Введите сообщение и нажмите <Enter>'})
		
		chatInput.addEventListener('keyup', async (event) => {
			
			if(event.code === 'Enter'){
				
				if(chatInput.value.length < 2){
					
					throw 'Количество символов < 2';
					
				}
				
				if(chatInput.value.length > 256){
					
					throw 'Количество символов > 256';
					
				}
				
				await App.api.request('mmtest','chat',{id:MM.id,message:chatInput.value});
				
				chatInput.value = '';
				
			}
			
		});
		
		let body = DOM({style:'mm-lobby'},DOM({style:'mm-lobby-header'},leftTeam,info,rightTeam),DOM({style:'mm-lobby-middle'},DOM({style:'mm-lobby-middle-chat'},MM.chatBody,chatInput),lobbyBuild,MM.lobbyHeroes));
		
		Sound.play('content/sounds/tambur.ogg',{id:'tambur',volume:0.50,loop:true});
		
		Sound.setVolume('castle', 0.0);
		
		MM.show(body);
		
		for(let key in data.users){
			
			if(!data.users[key].hero){
				
				continue;
				
			}
			
			let findHero = document.getElementById(`HERO${data.users[key].hero}`);
			
			if(findHero){
				
				findHero.style.filter = 'grayscale(100%)';
				
				findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
				
				findHero.dataset.ban = key;
				
			}
			
		}
		
	}
	
	static async select(data){
		
		Sound.play(`content/hero/${data.heroId}/revive/${data.sound}.ogg`,{volume:0.75});
		
		MM.lobbyPlayerAnimate.cancel();
		
		await Timer.start(data.id,'',() => {
			
			MM.close();
			
			MM.searchActive(true);
			
		});
		
		let findOldPlayer = document.getElementById(`PLAYER${data.userId}`);
		
		if(findOldPlayer){
			
			findOldPlayer.dataset.hero = data.heroId;
			
			findOldPlayer.firstChild.style.backgroundImage = `url(content/hero/${data.heroId}/1.webp)`;
			
			findOldPlayer.firstChild.firstChild.firstChild.innerText = data.rating;
			
			findOldPlayer.firstChild.firstChild.lastChild.style.backgroundImage = `url(content/ranks/${Rank.icon(data.rating)}.webp)`;
			
		}
		
		if(data.target != 0){
			
			let findPlayer = document.getElementById(`PLAYER${data.target}`);
			
			if(findPlayer){
				
				MM.lobbyPlayerAnimate = findPlayer.animate({transform:['scale(1)','scale(0.8)','scale(1.2)','scale(1)']},{duration:500,iterations:Infinity,easing:'ease-in-out'});
				
			}
			
		}
		
		for(let child of MM.lobbyHeroes.children){
			
			if(child.dataset.ban == data.userId){
				
				child.dataset.ban = 0;
				
				child.style.filter = 'none';
				
				child.style.backgroundColor = 'rgba(255, 255, 255, 0)';
				
				break;
				
			}
			
		}
		
		let findHero = document.getElementById(`HERO${data.heroId}`);
		
		if(findHero){
			
			findHero.style.filter = 'grayscale(100%)';
			
			findHero.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
			
			findHero.onclick = false;
			
		}
		
		if(App.storage.data.id == data.target){
			
			MM.lobbyConfirm.style.opacity = 1;
			
		}
		else{
			
			MM.lobbyConfirm.style.opacity = 0;
			
		}
		
	}
	
	static finish(data){
		
		Timer.stop();
		
		MM.close();

		MM.gameRunEvent();
		
		PWGame.start(data.key, MM.gameStopEvent);
		
		View.show('castle');
		
	}
	
	static eventChangeHero(data){
		
		let findPlayer = document.getElementById(`PLAYER${data.id}`);
		
		if(findPlayer){
			
			findPlayer.dataset.hero = data.heroId;
			
			findPlayer.firstChild.style.backgroundImage = `url(content/hero/${data.heroId}/1.webp)`;
			
			findPlayer.firstChild.firstChild.firstChild.innerText = data.rating;
			
			findPlayer.firstChild.firstChild.lastChild.style.backgroundImage = `url(content/ranks/${Rank.icon(data.rating)}.webp)`;
			
		}
		/*
		let oldHero = MM.lobbyUsers[data.id].hero, countHero = 0;
		
		for(let key in MM.lobbyUsers){
			
			if(MM.lobbyUsers[key].hero == oldHero){
				
				countHero++;
				
			}
			
		}
		
		if(countHero == 1){
			
			let findHero = document.getElementById(`HERO${oldHero}`);
			
			if(findHero){
				
				findHero.style.backgroundColor = 'rgba(51, 255, 51, 0)';
				
				findHero.dataset.active = 0;
				
			}
			
		}
		
		let findHero = document.getElementById(`HERO${data.heroId}`);
		
		if(findHero){
			
			if(findHero.dataset.active == 0){
				
				findHero.style.backgroundColor = 'rgba(51, 255, 51, 0.8)';
				
				findHero.dataset.active = 1;
				
				MM.lobbyUsers[data.id].hero = data.heroId;
				
			}
			
		}
		*/
	}
	
	static chat(data){
		
		let message = DOM(`${data.message}`);
		
		if(data.id == 1){
			
			message.style.color = 'red';
			
		}
		
		let item = DOM({style:'mm-lobby-middle-chat-body-item'},DOM(`${MM.lobbyUsers[data.id].nickname}`),message);
		
		MM.chatBody.append(item);
		
		item.scrollIntoView({block:'end',behavior:'smooth'});
		
	}
	
}

class Sound {
	
	static all = new Object();
	
	static play(source,object = new Object(), callback){
		
		let audio = new Audio();
		
		if( ('volume' in object) && (object.volume) ){
			
			audio.volume = object.volume;
			
		}
		
		if('loop' in object){
			
			audio.loop = true;
			
		}
		
		audio.preload = 'auto';
		
		audio.src = source;
		
		audio.play();

		if (callback) {
			
			audio.addEventListener("ended", (event) => {
				Sound.stop(object.id);
				Sound.play(callback(), object, callback)
			});
			
		}
		
		if( ('id' in object) && (object.id) ){
			
			if( !(object.id in Sound.all) ){
				
				Sound.all[object.id] = audio;
				
			}
			
		}
		
	}
	
	static stop(id){
		
		if(id in Sound.all){
			
			Sound.all[id].pause();
			
			delete Sound.all[id];
			
		}
		
	}

	static setVolume(id, volume){

		if(id in Sound.all){
			
			Sound.all[id].volume = volume;

		}
	}

	static pause(id){
		if(id in Sound.all){
			Sound.all[id].pause();
		}
	}
	static unpause(id){
		if(id in Sound.all){
			Sound.all[id].play();
		}
	}
	
}

class Timer {
	
	static intervalId = false;
	
	static init(){
		
		Timer.sb = DOM(`${name} 00:00`);
		
		Timer.body = DOM({style:'mm-timer'},Timer.sb);
		
	}
	
	static async start(id,name,callback){
		
		Timer.stop();
		
		Timer.callback = callback;
		
		Timer.message = name;

		Timer.timeFinish = await App.api.request('mmtest','getTimer',{id:id,time:Date.now()});
		
		if(Timer.end()){
			
			return;
			
		}
		
		Timer.intervalId = setInterval(() => Timer.update(),250);
		
		Timer.update();
		
	}
	
	static update(){
		
		if(Timer.end()){
			
			return;
			
		}
		
		let seconds = Math.abs(Date.now() - Timer.timeFinish) / 1000;
		
		Timer.sb.innerText = `${Timer.message} 00:${(seconds < 10 ? '0': '')}${seconds.toFixed(2)}`;
		
	}
	
	static end(){
		
		if( (Date.now() - Timer.timeFinish) >= 0){
			
			Timer.stop();
			
			Timer.callback();
			
			return true;
			
		}
		
		return false;
		
	}
	
	static stop(){
		
		if(Timer.intervalId){
			
			clearInterval(Timer.intervalId);
			
			Timer.intervalId = false;
			
		}
		
	}
	
}

class PreloadImages {
	
	static load(callback,url){
		
		let preload = new Image();
		
		preload.src = url;
		
		preload.addEventListener('load',() => {
			
			callback();
			
		});
		
	}
	
	static async loadAsync(url){
		
		let image = new Image();
		
		image.src = url;
		
		return new Promise((resolve,reject) => {
			
			image.addEventListener('load',() => {
				resolve(image);
			});
			
			image.addEventListener('error',(error) => reject(error));
			
		});
		
	}
	
	constructor(target,callback){
		
		this.target = target;
		
		this.callback = callback;
		
		this.observer = new IntersectionObserver((entries) => this.preload(entries));
		
	}
	
	add(element,target){
		
		element.style.opacity = 0;
		
		this.observer.observe(element);
		
		if(target){
			
			target.append(element);
			
		}
		else{
			
			this.target.append(element);
			
		}
		
	}
	
	preload(entries){
		
		for(let entry of entries){
			
			if(entry.isIntersecting){
				
				let preload = new Image();
				
				preload.src = entry.target.dataset.url;
				
				preload.addEventListener('load',() => {
					
					entry.target.style.backgroundImage = `url("${entry.target.dataset.url}")`;
					
					let animation = entry.target.animate({opacity:[0,1],transform:['scale(0.9)','scale(1)']},{duration:500,easing:'ease-out',fill:'forwards'});
					
					if(this.callback){
						
						animation.onfinish = () => {
							
							this.callback(entry.target);
							
							animation.onfinish = null;
							
						}
						
					}
					
				});
				
				this.observer.unobserve(entry.target);
				
			}
			
		}
		
	}
	
}

class Game {
	
	static sizeX = 10;
	
	static sizeY = 15;
	
	static weight = 64;
	
	static target = false;
	
	static targetAnimate = false;
	
	static blocked = false;
	
	static eventBack = false;
	
	static eventFinish = false;
	
	static eventExit = false;
	
	static init(body,object){
		
		if(object){
			
			if('back' in object){
				
				Game.eventBack = object.back;
				
			}
			
			if('finish' in object){
				
				Game.eventFinish = object.finish;
				
			}
			
			if('exit' in object){
				
				Game.eventExit = object.exit;
				
			}
			
		}
		
		Game.units = new Array();
		
		Game.field = document.createElement('div');
		
		Game.field.addEventListener('click',(event) => Game.click(event));
		
		Game.field.style.height = `${Game.sizeX * Game.weight}px`;
		
		Game.field.style.width = `${Game.sizeY * Game.weight}px`;
		
		Game.field.style.position = 'relative';
		
		Game.field.style.transform = 'scale(1.3)';
		
		Game.viewScore = document.createElement('div');
		
		Game.viewScore.style.width = `${Game.weight}px`;
		
		Game.viewScore.style.height = `${Game.sizeX * Game.weight}px`;
		
		Game.viewScore.style.position = 'absolute';
		
		Game.viewScore.style.left = '-100px';
		
		Game.viewScore.style.display = 'flex';
		
		Game.viewScore.style.flexFlow = 'column';
		
		Game.viewScore.style.justifyContent = 'center';
		
		Game.viewScore.style.alignItems = 'center';
		
		Game.viewScore.style.fontFamily = 'Tahoma';
		
		Game.viewScore.style.fontSize = '18px';
		
		Game.viewScore.style.color = 'rgba(255,255,255,0.8)';
		
		Game.viewScore.style.fontWeight = '800';
		
		Game.viewScore.style.textShadow = '1px 1px 2px rgba(0,0,0,0.9)';
		
		Game.viewInfo = document.createElement('div');
		
		Game.viewInfo.style.width = `${Game.sizeY * Game.weight}px`;
		
		Game.viewInfo.style.position = 'absolute';
		
		Game.viewInfo.style.top = '-25px';
		
		Game.viewInfo.style.fontFamily = 'Verdana';
		
		Game.viewInfo.style.fontStyle = 'italic';
		
		Game.viewInfo.style.fontSize = '14px';
		
		Game.viewInfo.style.color = 'rgba(255,255,255,0.3)';
		
		Game.viewInfo.style.textAlign = 'center';
		
		Game.viewInfo.style.cursor = 'pointer';
		
		Game.viewMoves = document.createElement('span');
		
		Game.viewTotalScore = document.createElement('span');
		
		Game.map = object.map;
		
		Game.background = object.background;
		
		Game.units = object.unit;
		
		Game.rarity = object.rarity;
		
		Game.moves = object.move;
		
		Game.dataScore = new Object();
		
		Game.totalScore = 0;
		
		if('score' in object){
			
			for(let id in object.score){
				
				Game.score(id,object.score[id]);
				
			}
			
		}
		
		Game.viewMoves.innerText = `Ходы: ${object.move} (${object.moveTotal})`;
		
		Game.viewTotalScore.innerText = `Оcколки: ${Game.totalScore} | `;
		
		Game.viewInfo.append(
		DOM({tag:'span',event:['click',() => Game.eventBack()]},'Вернуться назад'),
		DOM({tag:'span'},` | `),
		Game.viewTotalScore,
		Game.viewMoves,
		DOM({tag:'span'},` | `),
		DOM({tag:'span',event:['click',() => Game.eventFinish()]},'Завершить игру')
		);
		
		Game.field.append(Game.viewScore,Game.viewInfo);
		
		if(body){
			
			body.append(Game.field);
			
		}
		else{
			
			document.body.append(Game.field);
			
		}
		
		Game.view();
		
	}
	
	static score(id,number){
		
		if( (!id) || (id == '0') ){
			
			return;
			
		}
		
		if( !(id in Game.dataScore) ){
			
			let unit = document.createElement('div'), text = document.createElement('span');
			
			unit.classList.add(`rarity${Game.rarity[id]}`);
			
			unit.style.width = `${Game.weight}px`;
			
			unit.style.height = `${Game.weight}px`;
			
			unit.style.margin = '7px 0';
			
			unit.style.backgroundImage = `url(content/talents/${id}.webp)`;
			
			unit.style.position = 'relative';
			
			text.style.position = 'absolute';
			
			text.style.width = `${Game.weight}px`;
			
			text.style.textAlign = 'center';
			
			text.style.color = 'color:rgba(255,255,255,0.5)';
			
			text.style.left = '-25px';
			
			text.innerText = 0;
			
			unit.append(text);
			
			Game.dataScore[id] = unit;
			
			Game.viewScore.append(unit);
			
		}
		
		Game.totalScore += number;
		
		Game.viewTotalScore.innerText = `Оcколки: ${Game.totalScore} | `;
		
		Game.dataScore[id].firstChild.innerText = (Number(Game.dataScore[id].innerText) + number);
		
		Game.dataScore[id].animate({transform:['scale(1)','scale(1.5)','scale(1)']},{duration:250,fill:'both',easing:'ease-out'});
		
	}
	
	static position(coordinate){
		
		return (coordinate ? (coordinate * Game.weight) : 0);
		
	}
	
	static createUnit(id,x,y){
		
		let unit = document.createElement('div');
		
		unit.id = `${x}:${y}`;
		
		unit.style.width = `${Game.weight}px`;
		
		unit.style.height = `${Game.weight}px`;
		
		unit.style.zIndex = 9999;
		
		let rarity = '';
		
		switch(Game.rarity[id]){
			
			case 2: rarity = '0px 0px 25px rgba(174,80,251,0.8), inset 10px 10px 15px rgba(174,80,251,0.5)'; break;
			
			case 3: rarity = '0px 0px 25px rgba(255,156,32,0.8), inset 10px 10px 15px rgba(255,156,32,0.5)'; break;
			
			case 4: rarity = '0px 0px 25px rgba(255,26,26,0.8), inset 10px 10px 15px rgba(255,26,26,0.5)'; break;
			
		}
		
		if(rarity){
			
			unit.style.boxShadow = rarity;
			
		}
		
		unit.style.backgroundImage = `url(content/talents/${id}.webp)`;
		
		unit.style.backgroundRepeat = 'no-repeat';
		
		unit.style.backgroundSize = 'cover';
		
		unit.style.borderRadius = '15px';
		
		unit.style.position = 'absolute';
		
		unit.style.top = `${Game.position(x)}px`;
		
		unit.style.left = `${Game.position(y)}px`;
		
		unit.style.transform = 'scale(0.9)';
		
		unit.style.opacity = 0;
		
		Game.field.append(unit);
		
		return unit;
		
	}
	
	static createBackgroundUnit(x,y){
		
		let unit = document.createElement('div');
		
		unit.id = `BG:${x}:${y}`;
		
		unit.style.width = `${Game.weight}px`;
		
		unit.style.height = `${Game.weight}px`;
		
		unit.style.zIndex = 9998;
		
		unit.style.backgroundImage = `url(content/talents/763.webp)`;
		
		unit.style.backgroundRepeat = 'no-repeat';
		
		unit.style.backgroundSize = 'cover';
		
		unit.style.position = 'absolute';
		
		unit.style.top = `${Game.position(x)}px`;
		
		unit.style.left = `${Game.position(y)}px`;
		
		unit.style.transform = 'scale(0.9)';
		
		unit.style.opacity = 0;
		
		Game.field.append(unit);
		
		return unit;
		
	}
	
	static shuffle(arr){
		
		let j, temp;
		
		for(let i = arr.length - 1; i > 0; i--){
			
			j = Math.floor(Math.random()*(i + 1));
			
			temp = arr[j];
			
			arr[j] = arr[i];
			
			arr[i] = temp;
			
		}
		
		return arr;
		
	}
	
	static getRandomInt(min,max){
		
		min = Math.ceil(min);
		
		max = Math.floor(max);
		
		return Math.floor(Math.random() * (max - min + 1)) + min;
		
	}
	
	static view(){
		
		Game.blocked = true;
		
		let units = new Array(), background = new Array();
		
		for(let x = 0; x < Game.sizeX; x++){
			
			for(let y = 0; y < Game.sizeY; y++){
				
				if(Game.background[x][y]){
					
					background.push({x:x,y:y,body:Game.createBackgroundUnit(x,y)});
					
				}
				
				units.push(Game.createUnit(Game.map[x][y],x,y));
				
			}
			
		}
		
		units = Game.shuffle(units);
		
		let delay = 0, number = 0;
		
		for(let unit of units){
			
			number++;
			
			let animate = unit.animate({top:[`${parseInt(unit.style.top) + Game.getRandomInt(-50,50)}px`,unit.style.top],left:[`${parseInt(unit.style.left) + Game.getRandomInt(-50,50)}px`,unit.style.left],opacity:[0,1],transform:['scale(2.5)','scale(0.9)']},{delay:delay,duration:250,fill:'both',easing:'ease-out'});
			
			delay += 5;
			
			if(number == units.length){
				
				animate.onfinish = () => {
					
					for(let item of background){
						
						let state = Game.background[item.x][item.y];
						
						switch(state){
							
							case 1: state = 0.9; break;
							
							case 2: state = 0.6; break;
							
							case 3: state = 0.3; break;
							
						}
						
						item.body.animate({opacity:[0,state],transform:['scale(0.3)','scale(1)','scale(0.9)']},{duration:500,fill:'both',easing:'ease-in'});
						
					}
					
					Game.blocked = false;
					
					
					animate.onfinish = null;
					
				}
				
			}
			
		}
		
	}
	
	static async click(event){
		
		if(Game.blocked){
			
			return;
			
		}
		
		if(!event.target.id){
			
			return;
			
		}
		
		let data = event.target.id.split(':');
		
		if(!Game.map[data[0]][data[1]]){
			
			return;
			
		}
		
		if(Game.target){
			
			if(Game.target.id == event.target.id){
				
				Game.target = false;
				
				Game.targetAnimate.cancel();
				
				return;
				
			}
			
			Game.targetAnimate.cancel();
			
			try{
				
				await Game.move(Game.target,event.target);
				
			}
			catch(e){
				console.log(e);
				return Game.exit();
				
			}
			
			Game.target = false;
			
		}
		else{
			
			Game.target = event.target;
			
			Game.targetAnimate = Game.target.animate({transform:['scale(0.9)','scale(1.1)','scale(0.9)']},{duration:500,iterations:Infinity});
			
		}
		
	}
	
	static async move(element1,element2){
		
		Game.blocked = true;
		
		let data1 = element1.id.split(':'), data2 = element2.id.split(':');
		
		let protect = false;
		
		if( ( ( (Number(data1[0]) - 1) == data2[0]) && (data1[1] == data2[1]) ) || ( ( (Number(data1[0]) + 1) == data2[0]) && (data1[1] == data2[1]) ) || ( ( (Number(data1[1]) - 1) == data2[1]) && (data1[0] == data2[0]) ) || ( ( (Number(data1[1]) + 1) == data2[1]) && (data1[0] == data2[0]) ) ){
			
			protect = true;
			
		}
		
		if(!protect){
			
			Game.blocked = false;
			
			return;
			
		}
		
		let request = await App.api.request('gamev2','move2',{x1:data1[0],y1:data1[1],x2:data2[0],y2:data2[1]});
		
		if(request.render.length){
			
			element1.id = `${data2[0]}:${data2[1]}`;
			
			element2.id = `${data1[0]}:${data1[1]}`;
			
			Game.moves++;
			
			Game.viewMoves.innerText = `Ходов: ${request.move} (${request.moveTotal})`;
			
		}
		
		let element1Animate = element1.animate({top:[`${Game.position(data1[0])}px`,`${Game.position(data2[0])}px`],left:[`${Game.position(data1[1])}px`,`${Game.position(data2[1])}px`]},{duration:250,fill:'both'});
		
		let element2Animate = element2.animate({top:[`${Game.position(data2[0])}px`,`${Game.position(data1[0])}px`],left:[`${Game.position(data2[1])}px`,`${Game.position(data1[1])}px`]},{duration:250,fill:'both'});
		
		element1Animate.onfinish = async () => {
			
			if(request.render.length){
				
				for(let item of request.render){
					
					switch(item.action){
						
						case 'hide': 
						
						await Game.hideAnimate(item.data);
						
						await Game.backgroundAnimate(item.data);
						
						break;
						
						case 'move': await Game.moveAnimate(item.data); break;
						
						case 'add': await Game.dropAnimate(item.data); break;
						
					}
					
				}
				
				if(request.move != request.moveTotal){
					
					Game.blocked = false;
					
				}
				
			}
			else{
				
				element1Animate.reverse();
				
				if(request.move != request.moveTotal){
					
					Game.blocked = false;
					
				}
				
			}
			
			element1Animate.onfinish = null;
			
		}
		
		element2Animate.onfinish = () => {
			
			if(!request.render.length){
				
				element2Animate.reverse();
				
			}
			
			element2Animate.onfinish = null;
			
		}
		
	}
	
	static async hideAnimate(data){
		
		return new Promise((resolve,reject) => {
			
			if(!data.hide.length){
				
				resolve(false);
				
			}
			
			let number = 1;
			
			for(let unit of data.hide){
				
				let findUnit = document.getElementById(`${unit.x}:${unit.y}`);
				
				if(!findUnit){
					
					continue;
					
				}
				
				let animate = findUnit.animate({opacity:[1,0],transform:['scale(0.9)','scale(3)']},{duration:250,fill:'both',easing:'ease-out'});
				
				if(number == data.hide.length){
					
					animate.onfinish = () => {
						
						for(let id in data.score){
							
							Game.score(id,data.score[id]);
							
						}
						
						findUnit.remove();
						
						resolve(true);
						
					}
					
				}
				else{
					
					animate.onfinish = () => {
						
						findUnit.remove();
						
					}
					
				}
				
				number++;
				
			}
			
		});
		
	}
	
	static async backgroundAnimate(data){
		
		return new Promise((resolve,reject) => {
			
			if(!data.hide.length){
				
				resolve(false);
				
			}
			
			let hideBackground = new Array();
			
			for(let unit of data.hide){
				
				if(!Game.background[unit.x][unit.y]){
					
					continue;
					
				}
				
				hideBackground.push({x:unit.x,y:unit.y,body:document.getElementById(`BG:${unit.x}:${unit.y}`)});
				
			}
			
			if(!hideBackground.length){
				
				resolve(true);
				
			}
			
			let number = 0, state = [0,0.9,0.6,0.3];
			
			for(let item of hideBackground){
				
				number++;
				
				if(!item.body){
					
					continue;
					
				}
				
				let currentState = Game.background[item.x][item.y];
				
				Game.background[item.x][item.y]--;
				
				let animate = item.body.animate({opacity:[currentState,Game.background[item.x][item.y]],transform:['scale(0.9)','scale(1.6)','scale(0.9)']},{duration:500,fill:'both',easing:'ease-out'});
				
				if(number == hideBackground.length){
					
					animate.onfinish = () => {
						
						if(!Game.background[item.x][item.y]){
							
							item.body.remove();
							
						}
						
						resolve(true);
						
					}
					
				}
				else{
					
					animate.onfinish = () => {
						
						if(!Game.background[item.x][item.y]){
							
							item.body.remove();
							
						}
						
					}
					
				}
				
			}
			
		});
		
	}
	
	static async moveAnimate(data){
		
		return new Promise((resolve,reject) => {
			
			if(!data.length){
				
				resolve(false);
				
			}
			
			let number = 1;
			
			for(let unit of data){
				
				let findUnit = document.getElementById(`${unit.x1}:${unit.y1}`);
				
				findUnit.id = `${unit.x2}:${unit.y2}`;
				
				let animate = findUnit.animate({top:[`${Game.position(unit.x1)}px`,`${Game.position(unit.x2)}px`],transform:['rotate(0) scale(0.9)',`rotate(${Game.getRandomInt(-180,180)}deg) scale(0.9)`,'rotate(0) scale(0.9)']},{duration:250,fill:'both',easing:'ease-in'});
				
				if(number == data.length){
					
					animate.onfinish = () => {
						
						animate.onfinish = null;
						
						resolve(true);
						
					}
					
				}
				
				number++;
				
			}
			
		});
		
	}

	static async dropAnimate(data){
		
		return new Promise((resolve,reject) => {
			
			if(!data.length){
				
				resolve(false);
				
			}
			
			let number = 1;
			
			for(let unit of data){
				
				let createUnit = Game.createUnit(unit.id,unit.x,unit.y);
				
				let animate = createUnit.animate({opacity:[0,1],transform:['rotate(0) scale(0.9)','rotate(360deg) scale(0.9)']},{duration:250,fill:'both',easing:'ease-in'});
				
				if(number == data.length){
					
					animate.onfinish = () => {
						
						animate.onfinish = null;
						
						resolve(true);
						
					}
					
				}
				
				number++;
				
			}
			
		});
		
	}
	
	static exit(){
		
		if(Game.eventExit){
			
			Game.eventExit();
			
		}
		
	}
	
}


class Splash{
	
	static init(){
		
		Splash.body = document.createElement('div');
		
		Splash.body.style.display = 'none';
		
		Splash.body.classList.add('splash');
		
		document.body.append(Splash.body);
		
	}
	
	static show(element,content = true){
		
		if(Splash.body.firstChild){
			
			while(Splash.body.firstChild){
				
				Splash.body.firstChild.remove();
				
			}
			
		}
		
		if(content){
			
			let body = document.createElement('div');
			
			body.classList.add('splash-content');
			
			body.append(element);
			
			Splash.body.append(body);
			
		}
		else{
			
			Splash.body.append(element);
			
		}
		
		Splash.body.style.display = 'flex';
		
	}
	
	static hide(){
		
		Splash.body.style.display = 'none';
		
	}
	
}


function DOM(properties){
	
	let parent = document.createElement(  ( (typeof properties == 'object' ) && ('tag' in properties) ) ? properties.tag : 'div' );
		
		if(typeof properties == 'string'){
			
			parent.append(properties);
			
		}
		else{
			
			for(let property in properties){
				
				if(property == 'tag')continue;
				
				switch(property){
					
					case 'style':
					
					if (typeof properties.style === 'string') {
						parent.classList.add(properties.style);
					} else {
						parent.classList.add(...properties.style);
					}
					
					break;
					
					case 'data':
					
					for(let key in properties.data){
						
						parent.dataset[key] = properties.data[key];
						
					}
					
					break;
					
					case 'event':
					
					parent.addEventListener(properties.event[0],properties.event[1]);
					
					break;
					
					default:
					
					parent[property] = properties[property];
					
					break;
					
				}
				
			}
			
		}
		
		if(arguments.length > 1){
			
			let i,fragment = document.createDocumentFragment();
			
			for(i = 1; i < arguments.length; i++){
				
				fragment.append(arguments[i]);
			
			}
			
			parent.append(fragment);
		
		}
	
	return parent;
	
}

/**
 * @fileoverview gl-matrix - High performance matrix and vector operations
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 2.3.2
 */

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @fileoverview gl-matrix - High performance matrix and vector operations
	 * @author Brandon Jones
	 * @author Colin MacKenzie IV
	 * @version 2.3.2
	 */

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */
	// END HEADER

	exports.glMatrix = __webpack_require__(1);
	exports.mat2 = __webpack_require__(2);
	exports.mat2d = __webpack_require__(3);
	exports.mat3 = __webpack_require__(4);
	exports.mat4 = __webpack_require__(5);
	exports.quat = __webpack_require__(6);
	exports.vec2 = __webpack_require__(9);
	exports.vec3 = __webpack_require__(7);
	exports.vec4 = __webpack_require__(8);

/***/ },
/* 1 */
/***/ function(module, exports) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	/**
	 * @class Common utilities
	 * @name glMatrix
	 */
	var glMatrix = {};

	// Configuration Constants
	glMatrix.EPSILON = 0.000001;
	glMatrix.ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
	glMatrix.RANDOM = Math.random;
	glMatrix.ENABLE_SIMD = false;

	// Capability detection
	glMatrix.SIMD_AVAILABLE = (glMatrix.ARRAY_TYPE === Float32Array) && ('SIMD' in this);
	glMatrix.USE_SIMD = glMatrix.ENABLE_SIMD && glMatrix.SIMD_AVAILABLE;

	/**
	 * Sets the type of array used when creating new vectors and matrices
	 *
	 * @param {Type} type Array type, such as Float32Array or Array
	 */
	glMatrix.setMatrixArrayType = function(type) {
	    glMatrix.ARRAY_TYPE = type;
	}

	var degree = Math.PI / 180;

	/**
	* Convert Degree To Radian
	*
	* @param {Number} Angle in Degrees
	*/
	glMatrix.toRadian = function(a){
	     return a * degree;
	}

	module.exports = glMatrix;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	var glMatrix = __webpack_require__(1);

	/**
	 * @class 2x2 Matrix
	 * @name mat2
	 */
	var mat2 = {};

	/**
	 * Creates a new identity mat2
	 *
	 * @returns {mat2} a new 2x2 matrix
	 */
	mat2.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    return out;
	};

	/**
	 * Creates a new mat2 initialized with values from an existing matrix
	 *
	 * @param {mat2} a matrix to clone
	 * @returns {mat2} a new 2x2 matrix
	 */
	mat2.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    return out;
	};

	/**
	 * Copy the values from one mat2 to another
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the source matrix
	 * @returns {mat2} out
	 */
	mat2.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    return out;
	};

	/**
	 * Set a mat2 to the identity matrix
	 *
	 * @param {mat2} out the receiving matrix
	 * @returns {mat2} out
	 */
	mat2.identity = function(out) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    return out;
	};

	/**
	 * Transpose the values of a mat2
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the source matrix
	 * @returns {mat2} out
	 */
	mat2.transpose = function(out, a) {
	    // If we are transposing ourselves we can skip a few steps but have to cache some values
	    if (out === a) {
	        var a1 = a[1];
	        out[1] = a[2];
	        out[2] = a1;
	    } else {
	        out[0] = a[0];
	        out[1] = a[2];
	        out[2] = a[1];
	        out[3] = a[3];
	    }
	    
	    return out;
	};

	/**
	 * Inverts a mat2
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the source matrix
	 * @returns {mat2} out
	 */
	mat2.invert = function(out, a) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

	        // Calculate the determinant
	        det = a0 * a3 - a2 * a1;

	    if (!det) {
	        return null;
	    }
	    det = 1.0 / det;
	    
	    out[0] =  a3 * det;
	    out[1] = -a1 * det;
	    out[2] = -a2 * det;
	    out[3] =  a0 * det;

	    return out;
	};

	/**
	 * Calculates the adjugate of a mat2
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the source matrix
	 * @returns {mat2} out
	 */
	mat2.adjoint = function(out, a) {
	    // Caching this value is nessecary if out == a
	    var a0 = a[0];
	    out[0] =  a[3];
	    out[1] = -a[1];
	    out[2] = -a[2];
	    out[3] =  a0;

	    return out;
	};

	/**
	 * Calculates the determinant of a mat2
	 *
	 * @param {mat2} a the source matrix
	 * @returns {Number} determinant of a
	 */
	mat2.determinant = function (a) {
	    return a[0] * a[3] - a[2] * a[1];
	};

	/**
	 * Multiplies two mat2's
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the first operand
	 * @param {mat2} b the second operand
	 * @returns {mat2} out
	 */
	mat2.multiply = function (out, a, b) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
	    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
	    out[0] = a0 * b0 + a2 * b1;
	    out[1] = a1 * b0 + a3 * b1;
	    out[2] = a0 * b2 + a2 * b3;
	    out[3] = a1 * b2 + a3 * b3;
	    return out;
	};

	/**
	 * Alias for {@link mat2.multiply}
	 * @function
	 */
	mat2.mul = mat2.multiply;

	/**
	 * Rotates a mat2 by the given angle
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat2} out
	 */
	mat2.rotate = function (out, a, rad) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
	        s = Math.sin(rad),
	        c = Math.cos(rad);
	    out[0] = a0 *  c + a2 * s;
	    out[1] = a1 *  c + a3 * s;
	    out[2] = a0 * -s + a2 * c;
	    out[3] = a1 * -s + a3 * c;
	    return out;
	};

	/**
	 * Scales the mat2 by the dimensions in the given vec2
	 *
	 * @param {mat2} out the receiving matrix
	 * @param {mat2} a the matrix to rotate
	 * @param {vec2} v the vec2 to scale the matrix by
	 * @returns {mat2} out
	 **/
	mat2.scale = function(out, a, v) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
	        v0 = v[0], v1 = v[1];
	    out[0] = a0 * v0;
	    out[1] = a1 * v0;
	    out[2] = a2 * v1;
	    out[3] = a3 * v1;
	    return out;
	};

	/**
	 * Creates a matrix from a given angle
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2.identity(dest);
	 *     mat2.rotate(dest, dest, rad);
	 *
	 * @param {mat2} out mat2 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat2} out
	 */
	mat2.fromRotation = function(out, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad);
	    out[0] = c;
	    out[1] = s;
	    out[2] = -s;
	    out[3] = c;
	    return out;
	}

	/**
	 * Creates a matrix from a vector scaling
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2.identity(dest);
	 *     mat2.scale(dest, dest, vec);
	 *
	 * @param {mat2} out mat2 receiving operation result
	 * @param {vec2} v Scaling vector
	 * @returns {mat2} out
	 */
	mat2.fromScaling = function(out, v) {
	    out[0] = v[0];
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = v[1];
	    return out;
	}

	/**
	 * Returns a string representation of a mat2
	 *
	 * @param {mat2} mat matrix to represent as a string
	 * @returns {String} string representation of the matrix
	 */
	mat2.str = function (a) {
	    return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
	};

	/**
	 * Returns Frobenius norm of a mat2
	 *
	 * @param {mat2} a the matrix to calculate Frobenius norm of
	 * @returns {Number} Frobenius norm
	 */
	mat2.frob = function (a) {
	    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
	};

	/**
	 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
	 * @param {mat2} L the lower triangular matrix 
	 * @param {mat2} D the diagonal matrix 
	 * @param {mat2} U the upper triangular matrix 
	 * @param {mat2} a the input matrix to factorize
	 */

	mat2.LDU = function (L, D, U, a) { 
	    L[2] = a[2]/a[0]; 
	    U[0] = a[0]; 
	    U[1] = a[1]; 
	    U[3] = a[3] - L[2] * U[1]; 
	    return [L, D, U];       
	}; 


	module.exports = mat2;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	var glMatrix = __webpack_require__(1);

	/**
	 * @class 2x3 Matrix
	 * @name mat2d
	 * 
	 * @description 
	 * A mat2d contains six elements defined as:
	 * <pre>
	 * [a, c, tx,
	 *  b, d, ty]
	 * </pre>
	 * This is a short form for the 3x3 matrix:
	 * <pre>
	 * [a, c, tx,
	 *  b, d, ty,
	 *  0, 0, 1]
	 * </pre>
	 * The last row is ignored so the array is shorter and operations are faster.
	 */
	var mat2d = {};

	/**
	 * Creates a new identity mat2d
	 *
	 * @returns {mat2d} a new 2x3 matrix
	 */
	mat2d.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(6);
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    out[4] = 0;
	    out[5] = 0;
	    return out;
	};

	/**
	 * Creates a new mat2d initialized with values from an existing matrix
	 *
	 * @param {mat2d} a matrix to clone
	 * @returns {mat2d} a new 2x3 matrix
	 */
	mat2d.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(6);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    return out;
	};

	/**
	 * Copy the values from one mat2d to another
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the source matrix
	 * @returns {mat2d} out
	 */
	mat2d.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    return out;
	};

	/**
	 * Set a mat2d to the identity matrix
	 *
	 * @param {mat2d} out the receiving matrix
	 * @returns {mat2d} out
	 */
	mat2d.identity = function(out) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    out[4] = 0;
	    out[5] = 0;
	    return out;
	};

	/**
	 * Inverts a mat2d
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the source matrix
	 * @returns {mat2d} out
	 */
	mat2d.invert = function(out, a) {
	    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
	        atx = a[4], aty = a[5];

	    var det = aa * ad - ab * ac;
	    if(!det){
	        return null;
	    }
	    det = 1.0 / det;

	    out[0] = ad * det;
	    out[1] = -ab * det;
	    out[2] = -ac * det;
	    out[3] = aa * det;
	    out[4] = (ac * aty - ad * atx) * det;
	    out[5] = (ab * atx - aa * aty) * det;
	    return out;
	};

	/**
	 * Calculates the determinant of a mat2d
	 *
	 * @param {mat2d} a the source matrix
	 * @returns {Number} determinant of a
	 */
	mat2d.determinant = function (a) {
	    return a[0] * a[3] - a[1] * a[2];
	};

	/**
	 * Multiplies two mat2d's
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the first operand
	 * @param {mat2d} b the second operand
	 * @returns {mat2d} out
	 */
	mat2d.multiply = function (out, a, b) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
	        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
	    out[0] = a0 * b0 + a2 * b1;
	    out[1] = a1 * b0 + a3 * b1;
	    out[2] = a0 * b2 + a2 * b3;
	    out[3] = a1 * b2 + a3 * b3;
	    out[4] = a0 * b4 + a2 * b5 + a4;
	    out[5] = a1 * b4 + a3 * b5 + a5;
	    return out;
	};

	/**
	 * Alias for {@link mat2d.multiply}
	 * @function
	 */
	mat2d.mul = mat2d.multiply;

	/**
	 * Rotates a mat2d by the given angle
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat2d} out
	 */
	mat2d.rotate = function (out, a, rad) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
	        s = Math.sin(rad),
	        c = Math.cos(rad);
	    out[0] = a0 *  c + a2 * s;
	    out[1] = a1 *  c + a3 * s;
	    out[2] = a0 * -s + a2 * c;
	    out[3] = a1 * -s + a3 * c;
	    out[4] = a4;
	    out[5] = a5;
	    return out;
	};

	/**
	 * Scales the mat2d by the dimensions in the given vec2
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the matrix to translate
	 * @param {vec2} v the vec2 to scale the matrix by
	 * @returns {mat2d} out
	 **/
	mat2d.scale = function(out, a, v) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
	        v0 = v[0], v1 = v[1];
	    out[0] = a0 * v0;
	    out[1] = a1 * v0;
	    out[2] = a2 * v1;
	    out[3] = a3 * v1;
	    out[4] = a4;
	    out[5] = a5;
	    return out;
	};

	/**
	 * Translates the mat2d by the dimensions in the given vec2
	 *
	 * @param {mat2d} out the receiving matrix
	 * @param {mat2d} a the matrix to translate
	 * @param {vec2} v the vec2 to translate the matrix by
	 * @returns {mat2d} out
	 **/
	mat2d.translate = function(out, a, v) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
	        v0 = v[0], v1 = v[1];
	    out[0] = a0;
	    out[1] = a1;
	    out[2] = a2;
	    out[3] = a3;
	    out[4] = a0 * v0 + a2 * v1 + a4;
	    out[5] = a1 * v0 + a3 * v1 + a5;
	    return out;
	};

	/**
	 * Creates a matrix from a given angle
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2d.identity(dest);
	 *     mat2d.rotate(dest, dest, rad);
	 *
	 * @param {mat2d} out mat2d receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat2d} out
	 */
	mat2d.fromRotation = function(out, rad) {
	    var s = Math.sin(rad), c = Math.cos(rad);
	    out[0] = c;
	    out[1] = s;
	    out[2] = -s;
	    out[3] = c;
	    out[4] = 0;
	    out[5] = 0;
	    return out;
	}

	/**
	 * Creates a matrix from a vector scaling
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2d.identity(dest);
	 *     mat2d.scale(dest, dest, vec);
	 *
	 * @param {mat2d} out mat2d receiving operation result
	 * @param {vec2} v Scaling vector
	 * @returns {mat2d} out
	 */
	mat2d.fromScaling = function(out, v) {
	    out[0] = v[0];
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = v[1];
	    out[4] = 0;
	    out[5] = 0;
	    return out;
	}

	/**
	 * Creates a matrix from a vector translation
	 * This is equivalent to (but much faster than):
	 *
	 *     mat2d.identity(dest);
	 *     mat2d.translate(dest, dest, vec);
	 *
	 * @param {mat2d} out mat2d receiving operation result
	 * @param {vec2} v Translation vector
	 * @returns {mat2d} out
	 */
	mat2d.fromTranslation = function(out, v) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    out[4] = v[0];
	    out[5] = v[1];
	    return out;
	}

	/**
	 * Returns a string representation of a mat2d
	 *
	 * @param {mat2d} a matrix to represent as a string
	 * @returns {String} string representation of the matrix
	 */
	mat2d.str = function (a) {
	    return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
	                    a[3] + ', ' + a[4] + ', ' + a[5] + ')';
	};

	/**
	 * Returns Frobenius norm of a mat2d
	 *
	 * @param {mat2d} a the matrix to calculate Frobenius norm of
	 * @returns {Number} Frobenius norm
	 */
	mat2d.frob = function (a) { 
	    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
	}; 

	module.exports = mat2d;


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	var glMatrix = __webpack_require__(1);

	/**
	 * @class 3x3 Matrix
	 * @name mat3
	 */
	var mat3 = {};

	/**
	 * Creates a new identity mat3
	 *
	 * @returns {mat3} a new 3x3 matrix
	 */
	mat3.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(9);
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 1;
	    out[5] = 0;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 1;
	    return out;
	};

	/**
	 * Copies the upper-left 3x3 values into the given mat3.
	 *
	 * @param {mat3} out the receiving 3x3 matrix
	 * @param {mat4} a   the source 4x4 matrix
	 * @returns {mat3} out
	 */
	mat3.fromMat4 = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[4];
	    out[4] = a[5];
	    out[5] = a[6];
	    out[6] = a[8];
	    out[7] = a[9];
	    out[8] = a[10];
	    return out;
	};

	/**
	 * Creates a new mat3 initialized with values from an existing matrix
	 *
	 * @param {mat3} a matrix to clone
	 * @returns {mat3} a new 3x3 matrix
	 */
	mat3.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(9);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    return out;
	};

	/**
	 * Copy the values from one mat3 to another
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the source matrix
	 * @returns {mat3} out
	 */
	mat3.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    return out;
	};

	/**
	 * Set a mat3 to the identity matrix
	 *
	 * @param {mat3} out the receiving matrix
	 * @returns {mat3} out
	 */
	mat3.identity = function(out) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 1;
	    out[5] = 0;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 1;
	    return out;
	};

	/**
	 * Transpose the values of a mat3
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the source matrix
	 * @returns {mat3} out
	 */
	mat3.transpose = function(out, a) {
	    // If we are transposing ourselves we can skip a few steps but have to cache some values
	    if (out === a) {
	        var a01 = a[1], a02 = a[2], a12 = a[5];
	        out[1] = a[3];
	        out[2] = a[6];
	        out[3] = a01;
	        out[5] = a[7];
	        out[6] = a02;
	        out[7] = a12;
	    } else {
	        out[0] = a[0];
	        out[1] = a[3];
	        out[2] = a[6];
	        out[3] = a[1];
	        out[4] = a[4];
	        out[5] = a[7];
	        out[6] = a[2];
	        out[7] = a[5];
	        out[8] = a[8];
	    }
	    
	    return out;
	};

	/**
	 * Inverts a mat3
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the source matrix
	 * @returns {mat3} out
	 */
	mat3.invert = function(out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8],

	        b01 = a22 * a11 - a12 * a21,
	        b11 = -a22 * a10 + a12 * a20,
	        b21 = a21 * a10 - a11 * a20,

	        // Calculate the determinant
	        det = a00 * b01 + a01 * b11 + a02 * b21;

	    if (!det) { 
	        return null; 
	    }
	    det = 1.0 / det;

	    out[0] = b01 * det;
	    out[1] = (-a22 * a01 + a02 * a21) * det;
	    out[2] = (a12 * a01 - a02 * a11) * det;
	    out[3] = b11 * det;
	    out[4] = (a22 * a00 - a02 * a20) * det;
	    out[5] = (-a12 * a00 + a02 * a10) * det;
	    out[6] = b21 * det;
	    out[7] = (-a21 * a00 + a01 * a20) * det;
	    out[8] = (a11 * a00 - a01 * a10) * det;
	    return out;
	};

	/**
	 * Calculates the adjugate of a mat3
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the source matrix
	 * @returns {mat3} out
	 */
	mat3.adjoint = function(out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8];

	    out[0] = (a11 * a22 - a12 * a21);
	    out[1] = (a02 * a21 - a01 * a22);
	    out[2] = (a01 * a12 - a02 * a11);
	    out[3] = (a12 * a20 - a10 * a22);
	    out[4] = (a00 * a22 - a02 * a20);
	    out[5] = (a02 * a10 - a00 * a12);
	    out[6] = (a10 * a21 - a11 * a20);
	    out[7] = (a01 * a20 - a00 * a21);
	    out[8] = (a00 * a11 - a01 * a10);
	    return out;
	};

	/**
	 * Calculates the determinant of a mat3
	 *
	 * @param {mat3} a the source matrix
	 * @returns {Number} determinant of a
	 */
	mat3.determinant = function (a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8];

	    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
	};

	/**
	 * Multiplies two mat3's
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the first operand
	 * @param {mat3} b the second operand
	 * @returns {mat3} out
	 */
	mat3.multiply = function (out, a, b) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8],

	        b00 = b[0], b01 = b[1], b02 = b[2],
	        b10 = b[3], b11 = b[4], b12 = b[5],
	        b20 = b[6], b21 = b[7], b22 = b[8];

	    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
	    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
	    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

	    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
	    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
	    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

	    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
	    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
	    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
	    return out;
	};

	/**
	 * Alias for {@link mat3.multiply}
	 * @function
	 */
	mat3.mul = mat3.multiply;

	/**
	 * Translate a mat3 by the given vector
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the matrix to translate
	 * @param {vec2} v vector to translate by
	 * @returns {mat3} out
	 */
	mat3.translate = function(out, a, v) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8],
	        x = v[0], y = v[1];

	    out[0] = a00;
	    out[1] = a01;
	    out[2] = a02;

	    out[3] = a10;
	    out[4] = a11;
	    out[5] = a12;

	    out[6] = x * a00 + y * a10 + a20;
	    out[7] = x * a01 + y * a11 + a21;
	    out[8] = x * a02 + y * a12 + a22;
	    return out;
	};

	/**
	 * Rotates a mat3 by the given angle
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat3} out
	 */
	mat3.rotate = function (out, a, rad) {
	    var a00 = a[0], a01 = a[1], a02 = a[2],
	        a10 = a[3], a11 = a[4], a12 = a[5],
	        a20 = a[6], a21 = a[7], a22 = a[8],

	        s = Math.sin(rad),
	        c = Math.cos(rad);

	    out[0] = c * a00 + s * a10;
	    out[1] = c * a01 + s * a11;
	    out[2] = c * a02 + s * a12;

	    out[3] = c * a10 - s * a00;
	    out[4] = c * a11 - s * a01;
	    out[5] = c * a12 - s * a02;

	    out[6] = a20;
	    out[7] = a21;
	    out[8] = a22;
	    return out;
	};

	/**
	 * Scales the mat3 by the dimensions in the given vec2
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat3} a the matrix to rotate
	 * @param {vec2} v the vec2 to scale the matrix by
	 * @returns {mat3} out
	 **/
	mat3.scale = function(out, a, v) {
	    var x = v[0], y = v[1];

	    out[0] = x * a[0];
	    out[1] = x * a[1];
	    out[2] = x * a[2];

	    out[3] = y * a[3];
	    out[4] = y * a[4];
	    out[5] = y * a[5];

	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    return out;
	};

	/**
	 * Creates a matrix from a vector translation
	 * This is equivalent to (but much faster than):
	 *
	 *     mat3.identity(dest);
	 *     mat3.translate(dest, dest, vec);
	 *
	 * @param {mat3} out mat3 receiving operation result
	 * @param {vec2} v Translation vector
	 * @returns {mat3} out
	 */
	mat3.fromTranslation = function(out, v) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 1;
	    out[5] = 0;
	    out[6] = v[0];
	    out[7] = v[1];
	    out[8] = 1;
	    return out;
	}

	/**
	 * Creates a matrix from a given angle
	 * This is equivalent to (but much faster than):
	 *
	 *     mat3.identity(dest);
	 *     mat3.rotate(dest, dest, rad);
	 *
	 * @param {mat3} out mat3 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat3} out
	 */
	mat3.fromRotation = function(out, rad) {
	    var s = Math.sin(rad), c = Math.cos(rad);

	    out[0] = c;
	    out[1] = s;
	    out[2] = 0;

	    out[3] = -s;
	    out[4] = c;
	    out[5] = 0;

	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 1;
	    return out;
	}

	/**
	 * Creates a matrix from a vector scaling
	 * This is equivalent to (but much faster than):
	 *
	 *     mat3.identity(dest);
	 *     mat3.scale(dest, dest, vec);
	 *
	 * @param {mat3} out mat3 receiving operation result
	 * @param {vec2} v Scaling vector
	 * @returns {mat3} out
	 */
	mat3.fromScaling = function(out, v) {
	    out[0] = v[0];
	    out[1] = 0;
	    out[2] = 0;

	    out[3] = 0;
	    out[4] = v[1];
	    out[5] = 0;

	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 1;
	    return out;
	}

	/**
	 * Copies the values from a mat2d into a mat3
	 *
	 * @param {mat3} out the receiving matrix
	 * @param {mat2d} a the matrix to copy
	 * @returns {mat3} out
	 **/
	mat3.fromMat2d = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = 0;

	    out[3] = a[2];
	    out[4] = a[3];
	    out[5] = 0;

	    out[6] = a[4];
	    out[7] = a[5];
	    out[8] = 1;
	    return out;
	};

	/**
	* Calculates a 3x3 matrix from the given quaternion
	*
	* @param {mat3} out mat3 receiving operation result
	* @param {quat} q Quaternion to create matrix from
	*
	* @returns {mat3} out
	*/
	mat3.fromQuat = function (out, q) {
	    var x = q[0], y = q[1], z = q[2], w = q[3],
	        x2 = x + x,
	        y2 = y + y,
	        z2 = z + z,

	        xx = x * x2,
	        yx = y * x2,
	        yy = y * y2,
	        zx = z * x2,
	        zy = z * y2,
	        zz = z * z2,
	        wx = w * x2,
	        wy = w * y2,
	        wz = w * z2;

	    out[0] = 1 - yy - zz;
	    out[3] = yx - wz;
	    out[6] = zx + wy;

	    out[1] = yx + wz;
	    out[4] = 1 - xx - zz;
	    out[7] = zy - wx;

	    out[2] = zx - wy;
	    out[5] = zy + wx;
	    out[8] = 1 - xx - yy;

	    return out;
	};

	/**
	* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
	*
	* @param {mat3} out mat3 receiving operation result
	* @param {mat4} a Mat4 to derive the normal matrix from
	*
	* @returns {mat3} out
	*/
	mat3.normalFromMat4 = function (out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

	        b00 = a00 * a11 - a01 * a10,
	        b01 = a00 * a12 - a02 * a10,
	        b02 = a00 * a13 - a03 * a10,
	        b03 = a01 * a12 - a02 * a11,
	        b04 = a01 * a13 - a03 * a11,
	        b05 = a02 * a13 - a03 * a12,
	        b06 = a20 * a31 - a21 * a30,
	        b07 = a20 * a32 - a22 * a30,
	        b08 = a20 * a33 - a23 * a30,
	        b09 = a21 * a32 - a22 * a31,
	        b10 = a21 * a33 - a23 * a31,
	        b11 = a22 * a33 - a23 * a32,

	        // Calculate the determinant
	        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

	    if (!det) { 
	        return null; 
	    }
	    det = 1.0 / det;

	    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
	    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
	    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

	    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
	    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
	    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

	    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
	    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
	    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

	    return out;
	};

	/**
	 * Returns a string representation of a mat3
	 *
	 * @param {mat3} mat matrix to represent as a string
	 * @returns {String} string representation of the matrix
	 */
	mat3.str = function (a) {
	    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
	                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + 
	                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
	};

	/**
	 * Returns Frobenius norm of a mat3
	 *
	 * @param {mat3} a the matrix to calculate Frobenius norm of
	 * @returns {Number} Frobenius norm
	 */
	mat3.frob = function (a) {
	    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
	};


	module.exports = mat3;


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	var glMatrix = __webpack_require__(1);

	/**
	 * @class 4x4 Matrix
	 * @name mat4
	 */
	var mat4 = {
	  scalar: {},
	  SIMD: {},
	};

	/**
	 * Creates a new identity mat4
	 *
	 * @returns {mat4} a new 4x4 matrix
	 */
	mat4.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(16);
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	};

	/**
	 * Creates a new mat4 initialized with values from an existing matrix
	 *
	 * @param {mat4} a matrix to clone
	 * @returns {mat4} a new 4x4 matrix
	 */
	mat4.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(16);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    out[9] = a[9];
	    out[10] = a[10];
	    out[11] = a[11];
	    out[12] = a[12];
	    out[13] = a[13];
	    out[14] = a[14];
	    out[15] = a[15];
	    return out;
	};

	/**
	 * Copy the values from one mat4 to another
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    out[4] = a[4];
	    out[5] = a[5];
	    out[6] = a[6];
	    out[7] = a[7];
	    out[8] = a[8];
	    out[9] = a[9];
	    out[10] = a[10];
	    out[11] = a[11];
	    out[12] = a[12];
	    out[13] = a[13];
	    out[14] = a[14];
	    out[15] = a[15];
	    return out;
	};

	/**
	 * Set a mat4 to the identity matrix
	 *
	 * @param {mat4} out the receiving matrix
	 * @returns {mat4} out
	 */
	mat4.identity = function(out) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	};

	/**
	 * Transpose the values of a mat4 not using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.scalar.transpose = function(out, a) {
	    // If we are transposing ourselves we can skip a few steps but have to cache some values
	    if (out === a) {
	        var a01 = a[1], a02 = a[2], a03 = a[3],
	            a12 = a[6], a13 = a[7],
	            a23 = a[11];

	        out[1] = a[4];
	        out[2] = a[8];
	        out[3] = a[12];
	        out[4] = a01;
	        out[6] = a[9];
	        out[7] = a[13];
	        out[8] = a02;
	        out[9] = a12;
	        out[11] = a[14];
	        out[12] = a03;
	        out[13] = a13;
	        out[14] = a23;
	    } else {
	        out[0] = a[0];
	        out[1] = a[4];
	        out[2] = a[8];
	        out[3] = a[12];
	        out[4] = a[1];
	        out[5] = a[5];
	        out[6] = a[9];
	        out[7] = a[13];
	        out[8] = a[2];
	        out[9] = a[6];
	        out[10] = a[10];
	        out[11] = a[14];
	        out[12] = a[3];
	        out[13] = a[7];
	        out[14] = a[11];
	        out[15] = a[15];
	    }

	    return out;
	};

	/**
	 * Transpose the values of a mat4 using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.SIMD.transpose = function(out, a) {
	    var a0, a1, a2, a3,
	        tmp01, tmp23,
	        out0, out1, out2, out3;

	    a0 = SIMD.Float32x4.load(a, 0);
	    a1 = SIMD.Float32x4.load(a, 4);
	    a2 = SIMD.Float32x4.load(a, 8);
	    a3 = SIMD.Float32x4.load(a, 12);

	    tmp01 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
	    tmp23 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
	    out0  = SIMD.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
	    out1  = SIMD.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
	    SIMD.Float32x4.store(out, 0,  out0);
	    SIMD.Float32x4.store(out, 4,  out1);

	    tmp01 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
	    tmp23 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
	    out2  = SIMD.Float32x4.shuffle(tmp01, tmp23, 0, 2, 4, 6);
	    out3  = SIMD.Float32x4.shuffle(tmp01, tmp23, 1, 3, 5, 7);
	    SIMD.Float32x4.store(out, 8,  out2);
	    SIMD.Float32x4.store(out, 12, out3);

	    return out;
	};

	/**
	 * Transpse a mat4 using SIMD if available and enabled
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.transpose = glMatrix.USE_SIMD ? mat4.SIMD.transpose : mat4.scalar.transpose;

	/**
	 * Inverts a mat4 not using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.scalar.invert = function(out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

	        b00 = a00 * a11 - a01 * a10,
	        b01 = a00 * a12 - a02 * a10,
	        b02 = a00 * a13 - a03 * a10,
	        b03 = a01 * a12 - a02 * a11,
	        b04 = a01 * a13 - a03 * a11,
	        b05 = a02 * a13 - a03 * a12,
	        b06 = a20 * a31 - a21 * a30,
	        b07 = a20 * a32 - a22 * a30,
	        b08 = a20 * a33 - a23 * a30,
	        b09 = a21 * a32 - a22 * a31,
	        b10 = a21 * a33 - a23 * a31,
	        b11 = a22 * a33 - a23 * a32,

	        // Calculate the determinant
	        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

	    if (!det) {
	        return null;
	    }
	    det = 1.0 / det;

	    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
	    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
	    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
	    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
	    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
	    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
	    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
	    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
	    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
	    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
	    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
	    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
	    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
	    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
	    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
	    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

	    return out;
	};

	/**
	 * Inverts a mat4 using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.SIMD.invert = function(out, a) {
	  var row0, row1, row2, row3,
	      tmp1,
	      minor0, minor1, minor2, minor3,
	      det,
	      a0 = SIMD.Float32x4.load(a, 0),
	      a1 = SIMD.Float32x4.load(a, 4),
	      a2 = SIMD.Float32x4.load(a, 8),
	      a3 = SIMD.Float32x4.load(a, 12);

	  // Compute matrix adjugate
	  tmp1 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
	  row1 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
	  row0 = SIMD.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
	  row1 = SIMD.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);
	  tmp1 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
	  row3 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
	  row2 = SIMD.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
	  row3 = SIMD.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

	  tmp1   = SIMD.Float32x4.mul(row2, row3);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor0 = SIMD.Float32x4.mul(row1, tmp1);
	  minor1 = SIMD.Float32x4.mul(row0, tmp1);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor0 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row1, tmp1), minor0);
	  minor1 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor1);
	  minor1 = SIMD.Float32x4.swizzle(minor1, 2, 3, 0, 1);

	  tmp1   = SIMD.Float32x4.mul(row1, row2);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor0);
	  minor3 = SIMD.Float32x4.mul(row0, tmp1);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row3, tmp1));
	  minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor3);
	  minor3 = SIMD.Float32x4.swizzle(minor3, 2, 3, 0, 1);

	  tmp1   = SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  row2   = SIMD.Float32x4.swizzle(row2, 2, 3, 0, 1);
	  minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor0);
	  minor2 = SIMD.Float32x4.mul(row0, tmp1);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row2, tmp1));
	  minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor2);
	  minor2 = SIMD.Float32x4.swizzle(minor2, 2, 3, 0, 1);

	  tmp1   = SIMD.Float32x4.mul(row0, row1);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor2);
	  minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row2, tmp1), minor3);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row3, tmp1), minor2);
	  minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row2, tmp1));

	  tmp1   = SIMD.Float32x4.mul(row0, row3);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row2, tmp1));
	  minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor2);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor1);
	  minor2 = SIMD.Float32x4.sub(minor2, SIMD.Float32x4.mul(row1, tmp1));

	  tmp1   = SIMD.Float32x4.mul(row0, row2);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor1);
	  minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row1, tmp1));
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row3, tmp1));
	  minor3 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor3);

	  // Compute matrix determinant
	  det   = SIMD.Float32x4.mul(row0, minor0);
	  det   = SIMD.Float32x4.add(SIMD.Float32x4.swizzle(det, 2, 3, 0, 1), det);
	  det   = SIMD.Float32x4.add(SIMD.Float32x4.swizzle(det, 1, 0, 3, 2), det);
	  tmp1  = SIMD.Float32x4.reciprocalApproximation(det);
	  det   = SIMD.Float32x4.sub(
	               SIMD.Float32x4.add(tmp1, tmp1),
	               SIMD.Float32x4.mul(det, SIMD.Float32x4.mul(tmp1, tmp1)));
	  det   = SIMD.Float32x4.swizzle(det, 0, 0, 0, 0);
	  if (!det) {
	      return null;
	  }

	  // Compute matrix inverse
	  SIMD.Float32x4.store(out, 0,  SIMD.Float32x4.mul(det, minor0));
	  SIMD.Float32x4.store(out, 4,  SIMD.Float32x4.mul(det, minor1));
	  SIMD.Float32x4.store(out, 8,  SIMD.Float32x4.mul(det, minor2));
	  SIMD.Float32x4.store(out, 12, SIMD.Float32x4.mul(det, minor3));
	  return out;
	}

	/**
	 * Inverts a mat4 using SIMD if available and enabled
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.invert = glMatrix.USE_SIMD ? mat4.SIMD.invert : mat4.scalar.invert;

	/**
	 * Calculates the adjugate of a mat4 not using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.scalar.adjoint = function(out, a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

	    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
	    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
	    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
	    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
	    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
	    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
	    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
	    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
	    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
	    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
	    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
	    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
	    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
	    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
	    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
	    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
	    return out;
	};

	/**
	 * Calculates the adjugate of a mat4 using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	mat4.SIMD.adjoint = function(out, a) {
	  var a0, a1, a2, a3;
	  var row0, row1, row2, row3;
	  var tmp1;
	  var minor0, minor1, minor2, minor3;

	  var a0 = SIMD.Float32x4.load(a, 0);
	  var a1 = SIMD.Float32x4.load(a, 4);
	  var a2 = SIMD.Float32x4.load(a, 8);
	  var a3 = SIMD.Float32x4.load(a, 12);

	  // Transpose the source matrix.  Sort of.  Not a true transpose operation
	  tmp1 = SIMD.Float32x4.shuffle(a0, a1, 0, 1, 4, 5);
	  row1 = SIMD.Float32x4.shuffle(a2, a3, 0, 1, 4, 5);
	  row0 = SIMD.Float32x4.shuffle(tmp1, row1, 0, 2, 4, 6);
	  row1 = SIMD.Float32x4.shuffle(row1, tmp1, 1, 3, 5, 7);

	  tmp1 = SIMD.Float32x4.shuffle(a0, a1, 2, 3, 6, 7);
	  row3 = SIMD.Float32x4.shuffle(a2, a3, 2, 3, 6, 7);
	  row2 = SIMD.Float32x4.shuffle(tmp1, row3, 0, 2, 4, 6);
	  row3 = SIMD.Float32x4.shuffle(row3, tmp1, 1, 3, 5, 7);

	  tmp1   = SIMD.Float32x4.mul(row2, row3);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor0 = SIMD.Float32x4.mul(row1, tmp1);
	  minor1 = SIMD.Float32x4.mul(row0, tmp1);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor0 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row1, tmp1), minor0);
	  minor1 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor1);
	  minor1 = SIMD.Float32x4.swizzle(minor1, 2, 3, 0, 1);

	  tmp1   = SIMD.Float32x4.mul(row1, row2);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor0);
	  minor3 = SIMD.Float32x4.mul(row0, tmp1);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row3, tmp1));
	  minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor3);
	  minor3 = SIMD.Float32x4.swizzle(minor3, 2, 3, 0, 1);

	  tmp1   = SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(row1, 2, 3, 0, 1), row3);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  row2   = SIMD.Float32x4.swizzle(row2, 2, 3, 0, 1);
	  minor0 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor0);
	  minor2 = SIMD.Float32x4.mul(row0, tmp1);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor0 = SIMD.Float32x4.sub(minor0, SIMD.Float32x4.mul(row2, tmp1));
	  minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row0, tmp1), minor2);
	  minor2 = SIMD.Float32x4.swizzle(minor2, 2, 3, 0, 1);

	  tmp1   = SIMD.Float32x4.mul(row0, row1);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor2);
	  minor3 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row2, tmp1), minor3);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor2 = SIMD.Float32x4.sub(SIMD.Float32x4.mul(row3, tmp1), minor2);
	  minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row2, tmp1));

	  tmp1   = SIMD.Float32x4.mul(row0, row3);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row2, tmp1));
	  minor2 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor2);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row2, tmp1), minor1);
	  minor2 = SIMD.Float32x4.sub(minor2, SIMD.Float32x4.mul(row1, tmp1));

	  tmp1   = SIMD.Float32x4.mul(row0, row2);
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 1, 0, 3, 2);
	  minor1 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row3, tmp1), minor1);
	  minor3 = SIMD.Float32x4.sub(minor3, SIMD.Float32x4.mul(row1, tmp1));
	  tmp1   = SIMD.Float32x4.swizzle(tmp1, 2, 3, 0, 1);
	  minor1 = SIMD.Float32x4.sub(minor1, SIMD.Float32x4.mul(row3, tmp1));
	  minor3 = SIMD.Float32x4.add(SIMD.Float32x4.mul(row1, tmp1), minor3);

	  SIMD.Float32x4.store(out, 0,  minor0);
	  SIMD.Float32x4.store(out, 4,  minor1);
	  SIMD.Float32x4.store(out, 8,  minor2);
	  SIMD.Float32x4.store(out, 12, minor3);
	  return out;
	};

	/**
	 * Calculates the adjugate of a mat4 using SIMD if available and enabled
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the source matrix
	 * @returns {mat4} out
	 */
	 mat4.adjoint = glMatrix.USE_SIMD ? mat4.SIMD.adjoint : mat4.scalar.adjoint;

	/**
	 * Calculates the determinant of a mat4
	 *
	 * @param {mat4} a the source matrix
	 * @returns {Number} determinant of a
	 */
	mat4.determinant = function (a) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

	        b00 = a00 * a11 - a01 * a10,
	        b01 = a00 * a12 - a02 * a10,
	        b02 = a00 * a13 - a03 * a10,
	        b03 = a01 * a12 - a02 * a11,
	        b04 = a01 * a13 - a03 * a11,
	        b05 = a02 * a13 - a03 * a12,
	        b06 = a20 * a31 - a21 * a30,
	        b07 = a20 * a32 - a22 * a30,
	        b08 = a20 * a33 - a23 * a30,
	        b09 = a21 * a32 - a22 * a31,
	        b10 = a21 * a33 - a23 * a31,
	        b11 = a22 * a33 - a23 * a32;

	    // Calculate the determinant
	    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	};

	/**
	 * Multiplies two mat4's explicitly using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the first operand, must be a Float32Array
	 * @param {mat4} b the second operand, must be a Float32Array
	 * @returns {mat4} out
	 */
	mat4.SIMD.multiply = function (out, a, b) {
	    var a0 = SIMD.Float32x4.load(a, 0);
	    var a1 = SIMD.Float32x4.load(a, 4);
	    var a2 = SIMD.Float32x4.load(a, 8);
	    var a3 = SIMD.Float32x4.load(a, 12);

	    var b0 = SIMD.Float32x4.load(b, 0);
	    var out0 = SIMD.Float32x4.add(
	                   SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 0, 0, 0, 0), a0),
	                   SIMD.Float32x4.add(
	                       SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 1, 1, 1, 1), a1),
	                       SIMD.Float32x4.add(
	                           SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 2, 2, 2, 2), a2),
	                           SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b0, 3, 3, 3, 3), a3))));
	    SIMD.Float32x4.store(out, 0, out0);

	    var b1 = SIMD.Float32x4.load(b, 4);
	    var out1 = SIMD.Float32x4.add(
	                   SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 0, 0, 0, 0), a0),
	                   SIMD.Float32x4.add(
	                       SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 1, 1, 1, 1), a1),
	                       SIMD.Float32x4.add(
	                           SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 2, 2, 2, 2), a2),
	                           SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b1, 3, 3, 3, 3), a3))));
	    SIMD.Float32x4.store(out, 4, out1);

	    var b2 = SIMD.Float32x4.load(b, 8);
	    var out2 = SIMD.Float32x4.add(
	                   SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 0, 0, 0, 0), a0),
	                   SIMD.Float32x4.add(
	                       SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 1, 1, 1, 1), a1),
	                       SIMD.Float32x4.add(
	                               SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 2, 2, 2, 2), a2),
	                               SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b2, 3, 3, 3, 3), a3))));
	    SIMD.Float32x4.store(out, 8, out2);

	    var b3 = SIMD.Float32x4.load(b, 12);
	    var out3 = SIMD.Float32x4.add(
	                   SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 0, 0, 0, 0), a0),
	                   SIMD.Float32x4.add(
	                        SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 1, 1, 1, 1), a1),
	                        SIMD.Float32x4.add(
	                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 2, 2, 2, 2), a2),
	                            SIMD.Float32x4.mul(SIMD.Float32x4.swizzle(b3, 3, 3, 3, 3), a3))));
	    SIMD.Float32x4.store(out, 12, out3);

	    return out;
	};

	/**
	 * Multiplies two mat4's explicitly not using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the first operand
	 * @param {mat4} b the second operand
	 * @returns {mat4} out
	 */
	mat4.scalar.multiply = function (out, a, b) {
	    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
	        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
	        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
	        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

	    // Cache only the current line of the second matrix
	    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
	    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
	    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
	    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
	    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
	    return out;
	};

	/**
	 * Multiplies two mat4's using SIMD if available and enabled
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the first operand
	 * @param {mat4} b the second operand
	 * @returns {mat4} out
	 */
	mat4.multiply = glMatrix.USE_SIMD ? mat4.SIMD.multiply : mat4.scalar.multiply;

	/**
	 * Alias for {@link mat4.multiply}
	 * @function
	 */
	mat4.mul = mat4.multiply;

	/**
	 * Translate a mat4 by the given vector not using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to translate
	 * @param {vec3} v vector to translate by
	 * @returns {mat4} out
	 */
	mat4.scalar.translate = function (out, a, v) {
	    var x = v[0], y = v[1], z = v[2],
	        a00, a01, a02, a03,
	        a10, a11, a12, a13,
	        a20, a21, a22, a23;

	    if (a === out) {
	        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
	        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
	        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
	        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
	    } else {
	        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
	        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
	        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

	        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
	        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
	        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

	        out[12] = a00 * x + a10 * y + a20 * z + a[12];
	        out[13] = a01 * x + a11 * y + a21 * z + a[13];
	        out[14] = a02 * x + a12 * y + a22 * z + a[14];
	        out[15] = a03 * x + a13 * y + a23 * z + a[15];
	    }

	    return out;
	};

	/**
	 * Translates a mat4 by the given vector using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to translate
	 * @param {vec3} v vector to translate by
	 * @returns {mat4} out
	 */
	mat4.SIMD.translate = function (out, a, v) {
	    var a0 = SIMD.Float32x4.load(a, 0),
	        a1 = SIMD.Float32x4.load(a, 4),
	        a2 = SIMD.Float32x4.load(a, 8),
	        a3 = SIMD.Float32x4.load(a, 12),
	        vec = SIMD.Float32x4(v[0], v[1], v[2] , 0);

	    if (a !== out) {
	        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
	        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
	        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
	    }

	    a0 = SIMD.Float32x4.mul(a0, SIMD.Float32x4.swizzle(vec, 0, 0, 0, 0));
	    a1 = SIMD.Float32x4.mul(a1, SIMD.Float32x4.swizzle(vec, 1, 1, 1, 1));
	    a2 = SIMD.Float32x4.mul(a2, SIMD.Float32x4.swizzle(vec, 2, 2, 2, 2));

	    var t0 = SIMD.Float32x4.add(a0, SIMD.Float32x4.add(a1, SIMD.Float32x4.add(a2, a3)));
	    SIMD.Float32x4.store(out, 12, t0);

	    return out;
	};

	/**
	 * Translates a mat4 by the given vector using SIMD if available and enabled
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to translate
	 * @param {vec3} v vector to translate by
	 * @returns {mat4} out
	 */
	mat4.translate = glMatrix.USE_SIMD ? mat4.SIMD.translate : mat4.scalar.translate;

	/**
	 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to scale
	 * @param {vec3} v the vec3 to scale the matrix by
	 * @returns {mat4} out
	 **/
	mat4.scalar.scale = function(out, a, v) {
	    var x = v[0], y = v[1], z = v[2];

	    out[0] = a[0] * x;
	    out[1] = a[1] * x;
	    out[2] = a[2] * x;
	    out[3] = a[3] * x;
	    out[4] = a[4] * y;
	    out[5] = a[5] * y;
	    out[6] = a[6] * y;
	    out[7] = a[7] * y;
	    out[8] = a[8] * z;
	    out[9] = a[9] * z;
	    out[10] = a[10] * z;
	    out[11] = a[11] * z;
	    out[12] = a[12];
	    out[13] = a[13];
	    out[14] = a[14];
	    out[15] = a[15];
	    return out;
	};

	/**
	 * Scales the mat4 by the dimensions in the given vec3 using vectorization
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to scale
	 * @param {vec3} v the vec3 to scale the matrix by
	 * @returns {mat4} out
	 **/
	mat4.SIMD.scale = function(out, a, v) {
	    var a0, a1, a2;
	    var vec = SIMD.Float32x4(v[0], v[1], v[2], 0);

	    a0 = SIMD.Float32x4.load(a, 0);
	    SIMD.Float32x4.store(
	        out, 0, SIMD.Float32x4.mul(a0, SIMD.Float32x4.swizzle(vec, 0, 0, 0, 0)));

	    a1 = SIMD.Float32x4.load(a, 4);
	    SIMD.Float32x4.store(
	        out, 4, SIMD.Float32x4.mul(a1, SIMD.Float32x4.swizzle(vec, 1, 1, 1, 1)));

	    a2 = SIMD.Float32x4.load(a, 8);
	    SIMD.Float32x4.store(
	        out, 8, SIMD.Float32x4.mul(a2, SIMD.Float32x4.swizzle(vec, 2, 2, 2, 2)));

	    out[12] = a[12];
	    out[13] = a[13];
	    out[14] = a[14];
	    out[15] = a[15];
	    return out;
	};

	/**
	 * Scales the mat4 by the dimensions in the given vec3 using SIMD if available and enabled
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to scale
	 * @param {vec3} v the vec3 to scale the matrix by
	 * @returns {mat4} out
	 */
	mat4.scale = glMatrix.USE_SIMD ? mat4.SIMD.scale : mat4.scalar.scale;

	/**
	 * Rotates a mat4 by the given angle around the given axis
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @param {vec3} axis the axis to rotate around
	 * @returns {mat4} out
	 */
	mat4.rotate = function (out, a, rad, axis) {
	    var x = axis[0], y = axis[1], z = axis[2],
	        len = Math.sqrt(x * x + y * y + z * z),
	        s, c, t,
	        a00, a01, a02, a03,
	        a10, a11, a12, a13,
	        a20, a21, a22, a23,
	        b00, b01, b02,
	        b10, b11, b12,
	        b20, b21, b22;

	    if (Math.abs(len) < glMatrix.EPSILON) { return null; }

	    len = 1 / len;
	    x *= len;
	    y *= len;
	    z *= len;

	    s = Math.sin(rad);
	    c = Math.cos(rad);
	    t = 1 - c;

	    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
	    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
	    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

	    // Construct the elements of the rotation matrix
	    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
	    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
	    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

	    // Perform rotation-specific matrix multiplication
	    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
	    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
	    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
	    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
	    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
	    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
	    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
	    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
	    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
	    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
	    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
	    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

	    if (a !== out) { // If the source and destination differ, copy the unchanged last row
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }
	    return out;
	};

	/**
	 * Rotates a matrix by the given angle around the X axis not using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.scalar.rotateX = function (out, a, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad),
	        a10 = a[4],
	        a11 = a[5],
	        a12 = a[6],
	        a13 = a[7],
	        a20 = a[8],
	        a21 = a[9],
	        a22 = a[10],
	        a23 = a[11];

	    if (a !== out) { // If the source and destination differ, copy the unchanged rows
	        out[0]  = a[0];
	        out[1]  = a[1];
	        out[2]  = a[2];
	        out[3]  = a[3];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }

	    // Perform axis-specific matrix multiplication
	    out[4] = a10 * c + a20 * s;
	    out[5] = a11 * c + a21 * s;
	    out[6] = a12 * c + a22 * s;
	    out[7] = a13 * c + a23 * s;
	    out[8] = a20 * c - a10 * s;
	    out[9] = a21 * c - a11 * s;
	    out[10] = a22 * c - a12 * s;
	    out[11] = a23 * c - a13 * s;
	    return out;
	};

	/**
	 * Rotates a matrix by the given angle around the X axis using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.SIMD.rotateX = function (out, a, rad) {
	    var s = SIMD.Float32x4.splat(Math.sin(rad)),
	        c = SIMD.Float32x4.splat(Math.cos(rad));

	    if (a !== out) { // If the source and destination differ, copy the unchanged rows
	      out[0]  = a[0];
	      out[1]  = a[1];
	      out[2]  = a[2];
	      out[3]  = a[3];
	      out[12] = a[12];
	      out[13] = a[13];
	      out[14] = a[14];
	      out[15] = a[15];
	    }

	    // Perform axis-specific matrix multiplication
	    var a_1 = SIMD.Float32x4.load(a, 4);
	    var a_2 = SIMD.Float32x4.load(a, 8);
	    SIMD.Float32x4.store(out, 4,
	                         SIMD.Float32x4.add(SIMD.Float32x4.mul(a_1, c), SIMD.Float32x4.mul(a_2, s)));
	    SIMD.Float32x4.store(out, 8,
	                         SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_2, c), SIMD.Float32x4.mul(a_1, s)));
	    return out;
	};

	/**
	 * Rotates a matrix by the given angle around the X axis using SIMD if availabe and enabled
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.rotateX = glMatrix.USE_SIMD ? mat4.SIMD.rotateX : mat4.scalar.rotateX;

	/**
	 * Rotates a matrix by the given angle around the Y axis not using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.scalar.rotateY = function (out, a, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad),
	        a00 = a[0],
	        a01 = a[1],
	        a02 = a[2],
	        a03 = a[3],
	        a20 = a[8],
	        a21 = a[9],
	        a22 = a[10],
	        a23 = a[11];

	    if (a !== out) { // If the source and destination differ, copy the unchanged rows
	        out[4]  = a[4];
	        out[5]  = a[5];
	        out[6]  = a[6];
	        out[7]  = a[7];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }

	    // Perform axis-specific matrix multiplication
	    out[0] = a00 * c - a20 * s;
	    out[1] = a01 * c - a21 * s;
	    out[2] = a02 * c - a22 * s;
	    out[3] = a03 * c - a23 * s;
	    out[8] = a00 * s + a20 * c;
	    out[9] = a01 * s + a21 * c;
	    out[10] = a02 * s + a22 * c;
	    out[11] = a03 * s + a23 * c;
	    return out;
	};

	/**
	 * Rotates a matrix by the given angle around the Y axis using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.SIMD.rotateY = function (out, a, rad) {
	    var s = SIMD.Float32x4.splat(Math.sin(rad)),
	        c = SIMD.Float32x4.splat(Math.cos(rad));

	    if (a !== out) { // If the source and destination differ, copy the unchanged rows
	        out[4]  = a[4];
	        out[5]  = a[5];
	        out[6]  = a[6];
	        out[7]  = a[7];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }

	    // Perform axis-specific matrix multiplication
	    var a_0 = SIMD.Float32x4.load(a, 0);
	    var a_2 = SIMD.Float32x4.load(a, 8);
	    SIMD.Float32x4.store(out, 0,
	                         SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_0, c), SIMD.Float32x4.mul(a_2, s)));
	    SIMD.Float32x4.store(out, 8,
	                         SIMD.Float32x4.add(SIMD.Float32x4.mul(a_0, s), SIMD.Float32x4.mul(a_2, c)));
	    return out;
	};

	/**
	 * Rotates a matrix by the given angle around the Y axis if SIMD available and enabled
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	 mat4.rotateY = glMatrix.USE_SIMD ? mat4.SIMD.rotateY : mat4.scalar.rotateY;

	/**
	 * Rotates a matrix by the given angle around the Z axis not using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.scalar.rotateZ = function (out, a, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad),
	        a00 = a[0],
	        a01 = a[1],
	        a02 = a[2],
	        a03 = a[3],
	        a10 = a[4],
	        a11 = a[5],
	        a12 = a[6],
	        a13 = a[7];

	    if (a !== out) { // If the source and destination differ, copy the unchanged last row
	        out[8]  = a[8];
	        out[9]  = a[9];
	        out[10] = a[10];
	        out[11] = a[11];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }

	    // Perform axis-specific matrix multiplication
	    out[0] = a00 * c + a10 * s;
	    out[1] = a01 * c + a11 * s;
	    out[2] = a02 * c + a12 * s;
	    out[3] = a03 * c + a13 * s;
	    out[4] = a10 * c - a00 * s;
	    out[5] = a11 * c - a01 * s;
	    out[6] = a12 * c - a02 * s;
	    out[7] = a13 * c - a03 * s;
	    return out;
	};

	/**
	 * Rotates a matrix by the given angle around the Z axis using SIMD
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.SIMD.rotateZ = function (out, a, rad) {
	    var s = SIMD.Float32x4.splat(Math.sin(rad)),
	        c = SIMD.Float32x4.splat(Math.cos(rad));

	    if (a !== out) { // If the source and destination differ, copy the unchanged last row
	        out[8]  = a[8];
	        out[9]  = a[9];
	        out[10] = a[10];
	        out[11] = a[11];
	        out[12] = a[12];
	        out[13] = a[13];
	        out[14] = a[14];
	        out[15] = a[15];
	    }

	    // Perform axis-specific matrix multiplication
	    var a_0 = SIMD.Float32x4.load(a, 0);
	    var a_1 = SIMD.Float32x4.load(a, 4);
	    SIMD.Float32x4.store(out, 0,
	                         SIMD.Float32x4.add(SIMD.Float32x4.mul(a_0, c), SIMD.Float32x4.mul(a_1, s)));
	    SIMD.Float32x4.store(out, 4,
	                         SIMD.Float32x4.sub(SIMD.Float32x4.mul(a_1, c), SIMD.Float32x4.mul(a_0, s)));
	    return out;
	};

	/**
	 * Rotates a matrix by the given angle around the Z axis if SIMD available and enabled
	 *
	 * @param {mat4} out the receiving matrix
	 * @param {mat4} a the matrix to rotate
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	 mat4.rotateZ = glMatrix.USE_SIMD ? mat4.SIMD.rotateZ : mat4.scalar.rotateZ;

	/**
	 * Creates a matrix from a vector translation
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.translate(dest, dest, vec);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {vec3} v Translation vector
	 * @returns {mat4} out
	 */
	mat4.fromTranslation = function(out, v) {
	    out[0] = 1;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = v[0];
	    out[13] = v[1];
	    out[14] = v[2];
	    out[15] = 1;
	    return out;
	}

	/**
	 * Creates a matrix from a vector scaling
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.scale(dest, dest, vec);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {vec3} v Scaling vector
	 * @returns {mat4} out
	 */
	mat4.fromScaling = function(out, v) {
	    out[0] = v[0];
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = v[1];
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = v[2];
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}

	/**
	 * Creates a matrix from a given angle around a given axis
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.rotate(dest, dest, rad, axis);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @param {vec3} axis the axis to rotate around
	 * @returns {mat4} out
	 */
	mat4.fromRotation = function(out, rad, axis) {
	    var x = axis[0], y = axis[1], z = axis[2],
	        len = Math.sqrt(x * x + y * y + z * z),
	        s, c, t;

	    if (Math.abs(len) < glMatrix.EPSILON) { return null; }

	    len = 1 / len;
	    x *= len;
	    y *= len;
	    z *= len;

	    s = Math.sin(rad);
	    c = Math.cos(rad);
	    t = 1 - c;

	    // Perform rotation-specific matrix multiplication
	    out[0] = x * x * t + c;
	    out[1] = y * x * t + z * s;
	    out[2] = z * x * t - y * s;
	    out[3] = 0;
	    out[4] = x * y * t - z * s;
	    out[5] = y * y * t + c;
	    out[6] = z * y * t + x * s;
	    out[7] = 0;
	    out[8] = x * z * t + y * s;
	    out[9] = y * z * t - x * s;
	    out[10] = z * z * t + c;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}

	/**
	 * Creates a matrix from the given angle around the X axis
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.rotateX(dest, dest, rad);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.fromXRotation = function(out, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad);

	    // Perform axis-specific matrix multiplication
	    out[0]  = 1;
	    out[1]  = 0;
	    out[2]  = 0;
	    out[3]  = 0;
	    out[4] = 0;
	    out[5] = c;
	    out[6] = s;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = -s;
	    out[10] = c;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}

	/**
	 * Creates a matrix from the given angle around the Y axis
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.rotateY(dest, dest, rad);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.fromYRotation = function(out, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad);

	    // Perform axis-specific matrix multiplication
	    out[0]  = c;
	    out[1]  = 0;
	    out[2]  = -s;
	    out[3]  = 0;
	    out[4] = 0;
	    out[5] = 1;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = s;
	    out[9] = 0;
	    out[10] = c;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}

	/**
	 * Creates a matrix from the given angle around the Z axis
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.rotateZ(dest, dest, rad);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {Number} rad the angle to rotate the matrix by
	 * @returns {mat4} out
	 */
	mat4.fromZRotation = function(out, rad) {
	    var s = Math.sin(rad),
	        c = Math.cos(rad);

	    // Perform axis-specific matrix multiplication
	    out[0]  = c;
	    out[1]  = s;
	    out[2]  = 0;
	    out[3]  = 0;
	    out[4] = -s;
	    out[5] = c;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 1;
	    out[11] = 0;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;
	    return out;
	}

	/**
	 * Creates a matrix from a quaternion rotation and vector translation
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.translate(dest, vec);
	 *     var quatMat = mat4.create();
	 *     quat4.toMat4(quat, quatMat);
	 *     mat4.multiply(dest, quatMat);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {quat4} q Rotation quaternion
	 * @param {vec3} v Translation vector
	 * @returns {mat4} out
	 */
	mat4.fromRotationTranslation = function (out, q, v) {
	    // Quaternion math
	    var x = q[0], y = q[1], z = q[2], w = q[3],
	        x2 = x + x,
	        y2 = y + y,
	        z2 = z + z,

	        xx = x * x2,
	        xy = x * y2,
	        xz = x * z2,
	        yy = y * y2,
	        yz = y * z2,
	        zz = z * z2,
	        wx = w * x2,
	        wy = w * y2,
	        wz = w * z2;

	    out[0] = 1 - (yy + zz);
	    out[1] = xy + wz;
	    out[2] = xz - wy;
	    out[3] = 0;
	    out[4] = xy - wz;
	    out[5] = 1 - (xx + zz);
	    out[6] = yz + wx;
	    out[7] = 0;
	    out[8] = xz + wy;
	    out[9] = yz - wx;
	    out[10] = 1 - (xx + yy);
	    out[11] = 0;
	    out[12] = v[0];
	    out[13] = v[1];
	    out[14] = v[2];
	    out[15] = 1;

	    return out;
	};

	/**
	 * Creates a matrix from a quaternion rotation, vector translation and vector scale
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.translate(dest, vec);
	 *     var quatMat = mat4.create();
	 *     quat4.toMat4(quat, quatMat);
	 *     mat4.multiply(dest, quatMat);
	 *     mat4.scale(dest, scale)
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {quat4} q Rotation quaternion
	 * @param {vec3} v Translation vector
	 * @param {vec3} s Scaling vector
	 * @returns {mat4} out
	 */
	mat4.fromRotationTranslationScale = function (out, q, v, s) {
	    // Quaternion math
	    var x = q[0], y = q[1], z = q[2], w = q[3],
	        x2 = x + x,
	        y2 = y + y,
	        z2 = z + z,

	        xx = x * x2,
	        xy = x * y2,
	        xz = x * z2,
	        yy = y * y2,
	        yz = y * z2,
	        zz = z * z2,
	        wx = w * x2,
	        wy = w * y2,
	        wz = w * z2,
	        sx = s[0],
	        sy = s[1],
	        sz = s[2];

	    out[0] = (1 - (yy + zz)) * sx;
	    out[1] = (xy + wz) * sx;
	    out[2] = (xz - wy) * sx;
	    out[3] = 0;
	    out[4] = (xy - wz) * sy;
	    out[5] = (1 - (xx + zz)) * sy;
	    out[6] = (yz + wx) * sy;
	    out[7] = 0;
	    out[8] = (xz + wy) * sz;
	    out[9] = (yz - wx) * sz;
	    out[10] = (1 - (xx + yy)) * sz;
	    out[11] = 0;
	    out[12] = v[0];
	    out[13] = v[1];
	    out[14] = v[2];
	    out[15] = 1;

	    return out;
	};

	/**
	 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
	 * This is equivalent to (but much faster than):
	 *
	 *     mat4.identity(dest);
	 *     mat4.translate(dest, vec);
	 *     mat4.translate(dest, origin);
	 *     var quatMat = mat4.create();
	 *     quat4.toMat4(quat, quatMat);
	 *     mat4.multiply(dest, quatMat);
	 *     mat4.scale(dest, scale)
	 *     mat4.translate(dest, negativeOrigin);
	 *
	 * @param {mat4} out mat4 receiving operation result
	 * @param {quat4} q Rotation quaternion
	 * @param {vec3} v Translation vector
	 * @param {vec3} s Scaling vector
	 * @param {vec3} o The origin vector around which to scale and rotate
	 * @returns {mat4} out
	 */
	mat4.fromRotationTranslationScaleOrigin = function (out, q, v, s, o) {
	  // Quaternion math
	  var x = q[0], y = q[1], z = q[2], w = q[3],
	      x2 = x + x,
	      y2 = y + y,
	      z2 = z + z,

	      xx = x * x2,
	      xy = x * y2,
	      xz = x * z2,
	      yy = y * y2,
	      yz = y * z2,
	      zz = z * z2,
	      wx = w * x2,
	      wy = w * y2,
	      wz = w * z2,

	      sx = s[0],
	      sy = s[1],
	      sz = s[2],

	      ox = o[0],
	      oy = o[1],
	      oz = o[2];

	  out[0] = (1 - (yy + zz)) * sx;
	  out[1] = (xy + wz) * sx;
	  out[2] = (xz - wy) * sx;
	  out[3] = 0;
	  out[4] = (xy - wz) * sy;
	  out[5] = (1 - (xx + zz)) * sy;
	  out[6] = (yz + wx) * sy;
	  out[7] = 0;
	  out[8] = (xz + wy) * sz;
	  out[9] = (yz - wx) * sz;
	  out[10] = (1 - (xx + yy)) * sz;
	  out[11] = 0;
	  out[12] = v[0] + ox - (out[0] * ox + out[4] * oy + out[8] * oz);
	  out[13] = v[1] + oy - (out[1] * ox + out[5] * oy + out[9] * oz);
	  out[14] = v[2] + oz - (out[2] * ox + out[6] * oy + out[10] * oz);
	  out[15] = 1;

	  return out;
	};

	mat4.fromQuat = function (out, q) {
	    var x = q[0], y = q[1], z = q[2], w = q[3],
	        x2 = x + x,
	        y2 = y + y,
	        z2 = z + z,

	        xx = x * x2,
	        yx = y * x2,
	        yy = y * y2,
	        zx = z * x2,
	        zy = z * y2,
	        zz = z * z2,
	        wx = w * x2,
	        wy = w * y2,
	        wz = w * z2;

	    out[0] = 1 - yy - zz;
	    out[1] = yx + wz;
	    out[2] = zx - wy;
	    out[3] = 0;

	    out[4] = yx - wz;
	    out[5] = 1 - xx - zz;
	    out[6] = zy + wx;
	    out[7] = 0;

	    out[8] = zx + wy;
	    out[9] = zy - wx;
	    out[10] = 1 - xx - yy;
	    out[11] = 0;

	    out[12] = 0;
	    out[13] = 0;
	    out[14] = 0;
	    out[15] = 1;

	    return out;
	};

	/**
	 * Generates a frustum matrix with the given bounds
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {Number} left Left bound of the frustum
	 * @param {Number} right Right bound of the frustum
	 * @param {Number} bottom Bottom bound of the frustum
	 * @param {Number} top Top bound of the frustum
	 * @param {Number} near Near bound of the frustum
	 * @param {Number} far Far bound of the frustum
	 * @returns {mat4} out
	 */
	mat4.frustum = function (out, left, right, bottom, top, near, far) {
	    var rl = 1 / (right - left),
	        tb = 1 / (top - bottom),
	        nf = 1 / (near - far);
	    out[0] = (near * 2) * rl;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = (near * 2) * tb;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = (right + left) * rl;
	    out[9] = (top + bottom) * tb;
	    out[10] = (far + near) * nf;
	    out[11] = -1;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = (far * near * 2) * nf;
	    out[15] = 0;
	    return out;
	};

	/**
	 * Generates a perspective projection matrix with the given bounds
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {number} fovy Vertical field of view in radians
	 * @param {number} aspect Aspect ratio. typically viewport width/height
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @returns {mat4} out
	 */
	mat4.perspective = function (out, fovy, aspect, near, far) {
	    var f = 1.0 / Math.tan(fovy / 2),
	        nf = 1 / (near - far);
	    out[0] = f / aspect;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = f;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = (far + near) * nf;
	    out[11] = -1;
	    out[12] = 0;
	    out[13] = 0;
	    out[14] = (2 * far * near) * nf;
	    out[15] = 0;
	    return out;
	};

	/**
	 * Generates a perspective projection matrix with the given field of view.
	 * This is primarily useful for generating projection matrices to be used
	 * with the still experiemental WebVR API.
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {number} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @returns {mat4} out
	 */
	mat4.perspectiveFromFieldOfView = function (out, fov, near, far) {
	    var upTan = Math.tan(fov.upDegrees * Math.PI/180.0),
	        downTan = Math.tan(fov.downDegrees * Math.PI/180.0),
	        leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0),
	        rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0),
	        xScale = 2.0 / (leftTan + rightTan),
	        yScale = 2.0 / (upTan + downTan);

	    out[0] = xScale;
	    out[1] = 0.0;
	    out[2] = 0.0;
	    out[3] = 0.0;
	    out[4] = 0.0;
	    out[5] = yScale;
	    out[6] = 0.0;
	    out[7] = 0.0;
	    out[8] = -((leftTan - rightTan) * xScale * 0.5);
	    out[9] = ((upTan - downTan) * yScale * 0.5);
	    out[10] = far / (near - far);
	    out[11] = -1.0;
	    out[12] = 0.0;
	    out[13] = 0.0;
	    out[14] = (far * near) / (near - far);
	    out[15] = 0.0;
	    return out;
	}

	/**
	 * Generates a orthogonal projection matrix with the given bounds
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {number} left Left bound of the frustum
	 * @param {number} right Right bound of the frustum
	 * @param {number} bottom Bottom bound of the frustum
	 * @param {number} top Top bound of the frustum
	 * @param {number} near Near bound of the frustum
	 * @param {number} far Far bound of the frustum
	 * @returns {mat4} out
	 */
	mat4.ortho = function (out, left, right, bottom, top, near, far) {
	    var lr = 1 / (left - right),
	        bt = 1 / (bottom - top),
	        nf = 1 / (near - far);
	    out[0] = -2 * lr;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    out[4] = 0;
	    out[5] = -2 * bt;
	    out[6] = 0;
	    out[7] = 0;
	    out[8] = 0;
	    out[9] = 0;
	    out[10] = 2 * nf;
	    out[11] = 0;
	    out[12] = (left + right) * lr;
	    out[13] = (top + bottom) * bt;
	    out[14] = (far + near) * nf;
	    out[15] = 1;
	    return out;
	};

	/**
	 * Generates a look-at matrix with the given eye position, focal point, and up axis
	 *
	 * @param {mat4} out mat4 frustum matrix will be written into
	 * @param {vec3} eye Position of the viewer
	 * @param {vec3} center Point the viewer is looking at
	 * @param {vec3} up vec3 pointing up
	 * @returns {mat4} out
	 */
	mat4.lookAt = function (out, eye, center, up) {
	    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
	        eyex = eye[0],
	        eyey = eye[1],
	        eyez = eye[2],
	        upx = up[0],
	        upy = up[1],
	        upz = up[2],
	        centerx = center[0],
	        centery = center[1],
	        centerz = center[2];

	    if (Math.abs(eyex - centerx) < glMatrix.EPSILON &&
	        Math.abs(eyey - centery) < glMatrix.EPSILON &&
	        Math.abs(eyez - centerz) < glMatrix.EPSILON) {
	        return mat4.identity(out);
	    }

	    z0 = eyex - centerx;
	    z1 = eyey - centery;
	    z2 = eyez - centerz;

	    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
	    z0 *= len;
	    z1 *= len;
	    z2 *= len;

	    x0 = upy * z2 - upz * z1;
	    x1 = upz * z0 - upx * z2;
	    x2 = upx * z1 - upy * z0;
	    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
	    if (!len) {
	        x0 = 0;
	        x1 = 0;
	        x2 = 0;
	    } else {
	        len = 1 / len;
	        x0 *= len;
	        x1 *= len;
	        x2 *= len;
	    }

	    y0 = z1 * x2 - z2 * x1;
	    y1 = z2 * x0 - z0 * x2;
	    y2 = z0 * x1 - z1 * x0;

	    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
	    if (!len) {
	        y0 = 0;
	        y1 = 0;
	        y2 = 0;
	    } else {
	        len = 1 / len;
	        y0 *= len;
	        y1 *= len;
	        y2 *= len;
	    }

	    out[0] = x0;
	    out[1] = y0;
	    out[2] = z0;
	    out[3] = 0;
	    out[4] = x1;
	    out[5] = y1;
	    out[6] = z1;
	    out[7] = 0;
	    out[8] = x2;
	    out[9] = y2;
	    out[10] = z2;
	    out[11] = 0;
	    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
	    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
	    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
	    out[15] = 1;

	    return out;
	};

	/**
	 * Returns a string representation of a mat4
	 *
	 * @param {mat4} mat matrix to represent as a string
	 * @returns {String} string representation of the matrix
	 */
	mat4.str = function (a) {
	    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
	                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
	                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' +
	                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
	};

	/**
	 * Returns Frobenius norm of a mat4
	 *
	 * @param {mat4} a the matrix to calculate Frobenius norm of
	 * @returns {Number} Frobenius norm
	 */
	mat4.frob = function (a) {
	    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
	};


	module.exports = mat4;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	var glMatrix = __webpack_require__(1);
	var mat3 = __webpack_require__(4);
	var vec3 = __webpack_require__(7);
	var vec4 = __webpack_require__(8);

	/**
	 * @class Quaternion
	 * @name quat
	 */
	var quat = {};

	/**
	 * Creates a new identity quat
	 *
	 * @returns {quat} a new quaternion
	 */
	quat.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = 0;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    return out;
	};

	/**
	 * Sets a quaternion to represent the shortest rotation from one
	 * vector to another.
	 *
	 * Both vectors are assumed to be unit length.
	 *
	 * @param {quat} out the receiving quaternion.
	 * @param {vec3} a the initial vector
	 * @param {vec3} b the destination vector
	 * @returns {quat} out
	 */
	quat.rotationTo = (function() {
	    var tmpvec3 = vec3.create();
	    var xUnitVec3 = vec3.fromValues(1,0,0);
	    var yUnitVec3 = vec3.fromValues(0,1,0);

	    return function(out, a, b) {
	        var dot = vec3.dot(a, b);
	        if (dot < -0.999999) {
	            vec3.cross(tmpvec3, xUnitVec3, a);
	            if (vec3.length(tmpvec3) < 0.000001)
	                vec3.cross(tmpvec3, yUnitVec3, a);
	            vec3.normalize(tmpvec3, tmpvec3);
	            quat.setAxisAngle(out, tmpvec3, Math.PI);
	            return out;
	        } else if (dot > 0.999999) {
	            out[0] = 0;
	            out[1] = 0;
	            out[2] = 0;
	            out[3] = 1;
	            return out;
	        } else {
	            vec3.cross(tmpvec3, a, b);
	            out[0] = tmpvec3[0];
	            out[1] = tmpvec3[1];
	            out[2] = tmpvec3[2];
	            out[3] = 1 + dot;
	            return quat.normalize(out, out);
	        }
	    };
	})();

	/**
	 * Sets the specified quaternion with values corresponding to the given
	 * axes. Each axis is a vec3 and is expected to be unit length and
	 * perpendicular to all other specified axes.
	 *
	 * @param {vec3} view  the vector representing the viewing direction
	 * @param {vec3} right the vector representing the local "right" direction
	 * @param {vec3} up    the vector representing the local "up" direction
	 * @returns {quat} out
	 */
	quat.setAxes = (function() {
	    var matr = mat3.create();

	    return function(out, view, right, up) {
	        matr[0] = right[0];
	        matr[3] = right[1];
	        matr[6] = right[2];

	        matr[1] = up[0];
	        matr[4] = up[1];
	        matr[7] = up[2];

	        matr[2] = -view[0];
	        matr[5] = -view[1];
	        matr[8] = -view[2];

	        return quat.normalize(out, quat.fromMat3(out, matr));
	    };
	})();

	/**
	 * Creates a new quat initialized with values from an existing quaternion
	 *
	 * @param {quat} a quaternion to clone
	 * @returns {quat} a new quaternion
	 * @function
	 */
	quat.clone = vec4.clone;

	/**
	 * Creates a new quat initialized with the given values
	 *
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @param {Number} w W component
	 * @returns {quat} a new quaternion
	 * @function
	 */
	quat.fromValues = vec4.fromValues;

	/**
	 * Copy the values from one quat to another
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the source quaternion
	 * @returns {quat} out
	 * @function
	 */
	quat.copy = vec4.copy;

	/**
	 * Set the components of a quat to the given values
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @param {Number} w W component
	 * @returns {quat} out
	 * @function
	 */
	quat.set = vec4.set;

	/**
	 * Set a quat to the identity quaternion
	 *
	 * @param {quat} out the receiving quaternion
	 * @returns {quat} out
	 */
	quat.identity = function(out) {
	    out[0] = 0;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 1;
	    return out;
	};

	/**
	 * Sets a quat from the given angle and rotation axis,
	 * then returns it.
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {vec3} axis the axis around which to rotate
	 * @param {Number} rad the angle in radians
	 * @returns {quat} out
	 **/
	quat.setAxisAngle = function(out, axis, rad) {
	    rad = rad * 0.5;
	    var s = Math.sin(rad);
	    out[0] = s * axis[0];
	    out[1] = s * axis[1];
	    out[2] = s * axis[2];
	    out[3] = Math.cos(rad);
	    return out;
	};

	/**
	 * Adds two quat's
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @returns {quat} out
	 * @function
	 */
	quat.add = vec4.add;

	/**
	 * Multiplies two quat's
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @returns {quat} out
	 */
	quat.multiply = function(out, a, b) {
	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        bx = b[0], by = b[1], bz = b[2], bw = b[3];

	    out[0] = ax * bw + aw * bx + ay * bz - az * by;
	    out[1] = ay * bw + aw * by + az * bx - ax * bz;
	    out[2] = az * bw + aw * bz + ax * by - ay * bx;
	    out[3] = aw * bw - ax * bx - ay * by - az * bz;
	    return out;
	};

	/**
	 * Alias for {@link quat.multiply}
	 * @function
	 */
	quat.mul = quat.multiply;

	/**
	 * Scales a quat by a scalar number
	 *
	 * @param {quat} out the receiving vector
	 * @param {quat} a the vector to scale
	 * @param {Number} b amount to scale the vector by
	 * @returns {quat} out
	 * @function
	 */
	quat.scale = vec4.scale;

	/**
	 * Rotates a quaternion by the given angle about the X axis
	 *
	 * @param {quat} out quat receiving operation result
	 * @param {quat} a quat to rotate
	 * @param {number} rad angle (in radians) to rotate
	 * @returns {quat} out
	 */
	quat.rotateX = function (out, a, rad) {
	    rad *= 0.5; 

	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        bx = Math.sin(rad), bw = Math.cos(rad);

	    out[0] = ax * bw + aw * bx;
	    out[1] = ay * bw + az * bx;
	    out[2] = az * bw - ay * bx;
	    out[3] = aw * bw - ax * bx;
	    return out;
	};

	/**
	 * Rotates a quaternion by the given angle about the Y axis
	 *
	 * @param {quat} out quat receiving operation result
	 * @param {quat} a quat to rotate
	 * @param {number} rad angle (in radians) to rotate
	 * @returns {quat} out
	 */
	quat.rotateY = function (out, a, rad) {
	    rad *= 0.5; 

	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        by = Math.sin(rad), bw = Math.cos(rad);

	    out[0] = ax * bw - az * by;
	    out[1] = ay * bw + aw * by;
	    out[2] = az * bw + ax * by;
	    out[3] = aw * bw - ay * by;
	    return out;
	};

	/**
	 * Rotates a quaternion by the given angle about the Z axis
	 *
	 * @param {quat} out quat receiving operation result
	 * @param {quat} a quat to rotate
	 * @param {number} rad angle (in radians) to rotate
	 * @returns {quat} out
	 */
	quat.rotateZ = function (out, a, rad) {
	    rad *= 0.5; 

	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        bz = Math.sin(rad), bw = Math.cos(rad);

	    out[0] = ax * bw + ay * bz;
	    out[1] = ay * bw - ax * bz;
	    out[2] = az * bw + aw * bz;
	    out[3] = aw * bw - az * bz;
	    return out;
	};

	/**
	 * Calculates the W component of a quat from the X, Y, and Z components.
	 * Assumes that quaternion is 1 unit in length.
	 * Any existing W component will be ignored.
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a quat to calculate W component of
	 * @returns {quat} out
	 */
	quat.calculateW = function (out, a) {
	    var x = a[0], y = a[1], z = a[2];

	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
	    return out;
	};

	/**
	 * Calculates the dot product of two quat's
	 *
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @returns {Number} dot product of a and b
	 * @function
	 */
	quat.dot = vec4.dot;

	/**
	 * Performs a linear interpolation between two quat's
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {quat} out
	 * @function
	 */
	quat.lerp = vec4.lerp;

	/**
	 * Performs a spherical linear interpolation between two quat
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {quat} out
	 */
	quat.slerp = function (out, a, b, t) {
	    // benchmarks:
	    //    http://jsperf.com/quaternion-slerp-implementations

	    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
	        bx = b[0], by = b[1], bz = b[2], bw = b[3];

	    var        omega, cosom, sinom, scale0, scale1;

	    // calc cosine
	    cosom = ax * bx + ay * by + az * bz + aw * bw;
	    // adjust signs (if necessary)
	    if ( cosom < 0.0 ) {
	        cosom = -cosom;
	        bx = - bx;
	        by = - by;
	        bz = - bz;
	        bw = - bw;
	    }
	    // calculate coefficients
	    if ( (1.0 - cosom) > 0.000001 ) {
	        // standard case (slerp)
	        omega  = Math.acos(cosom);
	        sinom  = Math.sin(omega);
	        scale0 = Math.sin((1.0 - t) * omega) / sinom;
	        scale1 = Math.sin(t * omega) / sinom;
	    } else {        
	        // "from" and "to" quaternions are very close 
	        //  ... so we can do a linear interpolation
	        scale0 = 1.0 - t;
	        scale1 = t;
	    }
	    // calculate final values
	    out[0] = scale0 * ax + scale1 * bx;
	    out[1] = scale0 * ay + scale1 * by;
	    out[2] = scale0 * az + scale1 * bz;
	    out[3] = scale0 * aw + scale1 * bw;
	    
	    return out;
	};

	/**
	 * Performs a spherical linear interpolation with two control points
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a the first operand
	 * @param {quat} b the second operand
	 * @param {quat} c the third operand
	 * @param {quat} d the fourth operand
	 * @param {Number} t interpolation amount
	 * @returns {quat} out
	 */
	quat.sqlerp = (function () {
	  var temp1 = quat.create();
	  var temp2 = quat.create();
	  
	  return function (out, a, b, c, d, t) {
	    quat.slerp(temp1, a, d, t);
	    quat.slerp(temp2, b, c, t);
	    quat.slerp(out, temp1, temp2, 2 * t * (1 - t));
	    
	    return out;
	  };
	}());

	/**
	 * Calculates the inverse of a quat
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a quat to calculate inverse of
	 * @returns {quat} out
	 */
	quat.invert = function(out, a) {
	    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
	        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
	        invDot = dot ? 1.0/dot : 0;
	    
	    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

	    out[0] = -a0*invDot;
	    out[1] = -a1*invDot;
	    out[2] = -a2*invDot;
	    out[3] = a3*invDot;
	    return out;
	};

	/**
	 * Calculates the conjugate of a quat
	 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a quat to calculate conjugate of
	 * @returns {quat} out
	 */
	quat.conjugate = function (out, a) {
	    out[0] = -a[0];
	    out[1] = -a[1];
	    out[2] = -a[2];
	    out[3] = a[3];
	    return out;
	};

	/**
	 * Calculates the length of a quat
	 *
	 * @param {quat} a vector to calculate length of
	 * @returns {Number} length of a
	 * @function
	 */
	quat.length = vec4.length;

	/**
	 * Alias for {@link quat.length}
	 * @function
	 */
	quat.len = quat.length;

	/**
	 * Calculates the squared length of a quat
	 *
	 * @param {quat} a vector to calculate squared length of
	 * @returns {Number} squared length of a
	 * @function
	 */
	quat.squaredLength = vec4.squaredLength;

	/**
	 * Alias for {@link quat.squaredLength}
	 * @function
	 */
	quat.sqrLen = quat.squaredLength;

	/**
	 * Normalize a quat
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {quat} a quaternion to normalize
	 * @returns {quat} out
	 * @function
	 */
	quat.normalize = vec4.normalize;

	/**
	 * Creates a quaternion from the given 3x3 rotation matrix.
	 *
	 * NOTE: The resultant quaternion is not normalized, so you should be sure
	 * to renormalize the quaternion yourself where necessary.
	 *
	 * @param {quat} out the receiving quaternion
	 * @param {mat3} m rotation matrix
	 * @returns {quat} out
	 * @function
	 */
	quat.fromMat3 = function(out, m) {
	    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
	    // article "Quaternion Calculus and Fast Animation".
	    var fTrace = m[0] + m[4] + m[8];
	    var fRoot;

	    if ( fTrace > 0.0 ) {
	        // |w| > 1/2, may as well choose w > 1/2
	        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
	        out[3] = 0.5 * fRoot;
	        fRoot = 0.5/fRoot;  // 1/(4w)
	        out[0] = (m[5]-m[7])*fRoot;
	        out[1] = (m[6]-m[2])*fRoot;
	        out[2] = (m[1]-m[3])*fRoot;
	    } else {
	        // |w| <= 1/2
	        var i = 0;
	        if ( m[4] > m[0] )
	          i = 1;
	        if ( m[8] > m[i*3+i] )
	          i = 2;
	        var j = (i+1)%3;
	        var k = (i+2)%3;
	        
	        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
	        out[i] = 0.5 * fRoot;
	        fRoot = 0.5 / fRoot;
	        out[3] = (m[j*3+k] - m[k*3+j]) * fRoot;
	        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
	        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
	    }
	    
	    return out;
	};

	/**
	 * Returns a string representation of a quatenion
	 *
	 * @param {quat} vec vector to represent as a string
	 * @returns {String} string representation of the vector
	 */
	quat.str = function (a) {
	    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
	};

	module.exports = quat;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	var glMatrix = __webpack_require__(1);

	/**
	 * @class 3 Dimensional Vector
	 * @name vec3
	 */
	var vec3 = {};

	/**
	 * Creates a new, empty vec3
	 *
	 * @returns {vec3} a new 3D vector
	 */
	vec3.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(3);
	    out[0] = 0;
	    out[1] = 0;
	    out[2] = 0;
	    return out;
	};

	/**
	 * Creates a new vec3 initialized with values from an existing vector
	 *
	 * @param {vec3} a vector to clone
	 * @returns {vec3} a new 3D vector
	 */
	vec3.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(3);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    return out;
	};

	/**
	 * Creates a new vec3 initialized with the given values
	 *
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @returns {vec3} a new 3D vector
	 */
	vec3.fromValues = function(x, y, z) {
	    var out = new glMatrix.ARRAY_TYPE(3);
	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    return out;
	};

	/**
	 * Copy the values from one vec3 to another
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the source vector
	 * @returns {vec3} out
	 */
	vec3.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    return out;
	};

	/**
	 * Set the components of a vec3 to the given values
	 *
	 * @param {vec3} out the receiving vector
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @returns {vec3} out
	 */
	vec3.set = function(out, x, y, z) {
	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    return out;
	};

	/**
	 * Adds two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.add = function(out, a, b) {
	    out[0] = a[0] + b[0];
	    out[1] = a[1] + b[1];
	    out[2] = a[2] + b[2];
	    return out;
	};

	/**
	 * Subtracts vector b from vector a
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.subtract = function(out, a, b) {
	    out[0] = a[0] - b[0];
	    out[1] = a[1] - b[1];
	    out[2] = a[2] - b[2];
	    return out;
	};

	/**
	 * Alias for {@link vec3.subtract}
	 * @function
	 */
	vec3.sub = vec3.subtract;

	/**
	 * Multiplies two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.multiply = function(out, a, b) {
	    out[0] = a[0] * b[0];
	    out[1] = a[1] * b[1];
	    out[2] = a[2] * b[2];
	    return out;
	};

	/**
	 * Alias for {@link vec3.multiply}
	 * @function
	 */
	vec3.mul = vec3.multiply;

	/**
	 * Divides two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.divide = function(out, a, b) {
	    out[0] = a[0] / b[0];
	    out[1] = a[1] / b[1];
	    out[2] = a[2] / b[2];
	    return out;
	};

	/**
	 * Alias for {@link vec3.divide}
	 * @function
	 */
	vec3.div = vec3.divide;

	/**
	 * Returns the minimum of two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.min = function(out, a, b) {
	    out[0] = Math.min(a[0], b[0]);
	    out[1] = Math.min(a[1], b[1]);
	    out[2] = Math.min(a[2], b[2]);
	    return out;
	};

	/**
	 * Returns the maximum of two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.max = function(out, a, b) {
	    out[0] = Math.max(a[0], b[0]);
	    out[1] = Math.max(a[1], b[1]);
	    out[2] = Math.max(a[2], b[2]);
	    return out;
	};

	/**
	 * Scales a vec3 by a scalar number
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the vector to scale
	 * @param {Number} b amount to scale the vector by
	 * @returns {vec3} out
	 */
	vec3.scale = function(out, a, b) {
	    out[0] = a[0] * b;
	    out[1] = a[1] * b;
	    out[2] = a[2] * b;
	    return out;
	};

	/**
	 * Adds two vec3's after scaling the second operand by a scalar value
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @param {Number} scale the amount to scale b by before adding
	 * @returns {vec3} out
	 */
	vec3.scaleAndAdd = function(out, a, b, scale) {
	    out[0] = a[0] + (b[0] * scale);
	    out[1] = a[1] + (b[1] * scale);
	    out[2] = a[2] + (b[2] * scale);
	    return out;
	};

	/**
	 * Calculates the euclidian distance between two vec3's
	 *
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {Number} distance between a and b
	 */
	vec3.distance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1],
	        z = b[2] - a[2];
	    return Math.sqrt(x*x + y*y + z*z);
	};

	/**
	 * Alias for {@link vec3.distance}
	 * @function
	 */
	vec3.dist = vec3.distance;

	/**
	 * Calculates the squared euclidian distance between two vec3's
	 *
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {Number} squared distance between a and b
	 */
	vec3.squaredDistance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1],
	        z = b[2] - a[2];
	    return x*x + y*y + z*z;
	};

	/**
	 * Alias for {@link vec3.squaredDistance}
	 * @function
	 */
	vec3.sqrDist = vec3.squaredDistance;

	/**
	 * Calculates the length of a vec3
	 *
	 * @param {vec3} a vector to calculate length of
	 * @returns {Number} length of a
	 */
	vec3.length = function (a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2];
	    return Math.sqrt(x*x + y*y + z*z);
	};

	/**
	 * Alias for {@link vec3.length}
	 * @function
	 */
	vec3.len = vec3.length;

	/**
	 * Calculates the squared length of a vec3
	 *
	 * @param {vec3} a vector to calculate squared length of
	 * @returns {Number} squared length of a
	 */
	vec3.squaredLength = function (a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2];
	    return x*x + y*y + z*z;
	};

	/**
	 * Alias for {@link vec3.squaredLength}
	 * @function
	 */
	vec3.sqrLen = vec3.squaredLength;

	/**
	 * Negates the components of a vec3
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a vector to negate
	 * @returns {vec3} out
	 */
	vec3.negate = function(out, a) {
	    out[0] = -a[0];
	    out[1] = -a[1];
	    out[2] = -a[2];
	    return out;
	};

	/**
	 * Returns the inverse of the components of a vec3
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a vector to invert
	 * @returns {vec3} out
	 */
	vec3.inverse = function(out, a) {
	  out[0] = 1.0 / a[0];
	  out[1] = 1.0 / a[1];
	  out[2] = 1.0 / a[2];
	  return out;
	};

	/**
	 * Normalize a vec3
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a vector to normalize
	 * @returns {vec3} out
	 */
	vec3.normalize = function(out, a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2];
	    var len = x*x + y*y + z*z;
	    if (len > 0) {
	        //TODO: evaluate use of glm_invsqrt here?
	        len = 1 / Math.sqrt(len);
	        out[0] = a[0] * len;
	        out[1] = a[1] * len;
	        out[2] = a[2] * len;
	    }
	    return out;
	};

	/**
	 * Calculates the dot product of two vec3's
	 *
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {Number} dot product of a and b
	 */
	vec3.dot = function (a, b) {
	    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	};

	/**
	 * Computes the cross product of two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @returns {vec3} out
	 */
	vec3.cross = function(out, a, b) {
	    var ax = a[0], ay = a[1], az = a[2],
	        bx = b[0], by = b[1], bz = b[2];

	    out[0] = ay * bz - az * by;
	    out[1] = az * bx - ax * bz;
	    out[2] = ax * by - ay * bx;
	    return out;
	};

	/**
	 * Performs a linear interpolation between two vec3's
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec3} out
	 */
	vec3.lerp = function (out, a, b, t) {
	    var ax = a[0],
	        ay = a[1],
	        az = a[2];
	    out[0] = ax + t * (b[0] - ax);
	    out[1] = ay + t * (b[1] - ay);
	    out[2] = az + t * (b[2] - az);
	    return out;
	};

	/**
	 * Performs a hermite interpolation with two control points
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @param {vec3} c the third operand
	 * @param {vec3} d the fourth operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec3} out
	 */
	vec3.hermite = function (out, a, b, c, d, t) {
	  var factorTimes2 = t * t,
	      factor1 = factorTimes2 * (2 * t - 3) + 1,
	      factor2 = factorTimes2 * (t - 2) + t,
	      factor3 = factorTimes2 * (t - 1),
	      factor4 = factorTimes2 * (3 - 2 * t);
	  
	  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
	  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
	  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
	  
	  return out;
	};

	/**
	 * Performs a bezier interpolation with two control points
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the first operand
	 * @param {vec3} b the second operand
	 * @param {vec3} c the third operand
	 * @param {vec3} d the fourth operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec3} out
	 */
	vec3.bezier = function (out, a, b, c, d, t) {
	  var inverseFactor = 1 - t,
	      inverseFactorTimesTwo = inverseFactor * inverseFactor,
	      factorTimes2 = t * t,
	      factor1 = inverseFactorTimesTwo * inverseFactor,
	      factor2 = 3 * t * inverseFactorTimesTwo,
	      factor3 = 3 * factorTimes2 * inverseFactor,
	      factor4 = factorTimes2 * t;
	  
	  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
	  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
	  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
	  
	  return out;
	};

	/**
	 * Generates a random vector with the given scale
	 *
	 * @param {vec3} out the receiving vector
	 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
	 * @returns {vec3} out
	 */
	vec3.random = function (out, scale) {
	    scale = scale || 1.0;

	    var r = glMatrix.RANDOM() * 2.0 * Math.PI;
	    var z = (glMatrix.RANDOM() * 2.0) - 1.0;
	    var zScale = Math.sqrt(1.0-z*z) * scale;

	    out[0] = Math.cos(r) * zScale;
	    out[1] = Math.sin(r) * zScale;
	    out[2] = z * scale;
	    return out;
	};

	/**
	 * Transforms the vec3 with a mat4.
	 * 4th vector component is implicitly '1'
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the vector to transform
	 * @param {mat4} m matrix to transform with
	 * @returns {vec3} out
	 */
	vec3.transformMat4 = function(out, a, m) {
	    var x = a[0], y = a[1], z = a[2],
	        w = m[3] * x + m[7] * y + m[11] * z + m[15];
	    w = w || 1.0;
	    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
	    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
	    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
	    return out;
	};

	/**
	 * Transforms the vec3 with a mat3.
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the vector to transform
	 * @param {mat4} m the 3x3 matrix to transform with
	 * @returns {vec3} out
	 */
	vec3.transformMat3 = function(out, a, m) {
	    var x = a[0], y = a[1], z = a[2];
	    out[0] = x * m[0] + y * m[3] + z * m[6];
	    out[1] = x * m[1] + y * m[4] + z * m[7];
	    out[2] = x * m[2] + y * m[5] + z * m[8];
	    return out;
	};

	/**
	 * Transforms the vec3 with a quat
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec3} a the vector to transform
	 * @param {quat} q quaternion to transform with
	 * @returns {vec3} out
	 */
	vec3.transformQuat = function(out, a, q) {
	    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

	    var x = a[0], y = a[1], z = a[2],
	        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

	        // calculate quat * vec
	        ix = qw * x + qy * z - qz * y,
	        iy = qw * y + qz * x - qx * z,
	        iz = qw * z + qx * y - qy * x,
	        iw = -qx * x - qy * y - qz * z;

	    // calculate result * inverse quat
	    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
	    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
	    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
	    return out;
	};

	/**
	 * Rotate a 3D vector around the x-axis
	 * @param {vec3} out The receiving vec3
	 * @param {vec3} a The vec3 point to rotate
	 * @param {vec3} b The origin of the rotation
	 * @param {Number} c The angle of rotation
	 * @returns {vec3} out
	 */
	vec3.rotateX = function(out, a, b, c){
	   var p = [], r=[];
		  //Translate point to the origin
		  p[0] = a[0] - b[0];
		  p[1] = a[1] - b[1];
	  	p[2] = a[2] - b[2];

		  //perform rotation
		  r[0] = p[0];
		  r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
		  r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);

		  //translate to correct position
		  out[0] = r[0] + b[0];
		  out[1] = r[1] + b[1];
		  out[2] = r[2] + b[2];

	  	return out;
	};

	/**
	 * Rotate a 3D vector around the y-axis
	 * @param {vec3} out The receiving vec3
	 * @param {vec3} a The vec3 point to rotate
	 * @param {vec3} b The origin of the rotation
	 * @param {Number} c The angle of rotation
	 * @returns {vec3} out
	 */
	vec3.rotateY = function(out, a, b, c){
	  	var p = [], r=[];
	  	//Translate point to the origin
	  	p[0] = a[0] - b[0];
	  	p[1] = a[1] - b[1];
	  	p[2] = a[2] - b[2];
	  
	  	//perform rotation
	  	r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
	  	r[1] = p[1];
	  	r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);
	  
	  	//translate to correct position
	  	out[0] = r[0] + b[0];
	  	out[1] = r[1] + b[1];
	  	out[2] = r[2] + b[2];
	  
	  	return out;
	};

	/**
	 * Rotate a 3D vector around the z-axis
	 * @param {vec3} out The receiving vec3
	 * @param {vec3} a The vec3 point to rotate
	 * @param {vec3} b The origin of the rotation
	 * @param {Number} c The angle of rotation
	 * @returns {vec3} out
	 */
	vec3.rotateZ = function(out, a, b, c){
	  	var p = [], r=[];
	  	//Translate point to the origin
	  	p[0] = a[0] - b[0];
	  	p[1] = a[1] - b[1];
	  	p[2] = a[2] - b[2];
	  
	  	//perform rotation
	  	r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
	  	r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
	  	r[2] = p[2];
	  
	  	//translate to correct position
	  	out[0] = r[0] + b[0];
	  	out[1] = r[1] + b[1];
	  	out[2] = r[2] + b[2];
	  
	  	return out;
	};

	/**
	 * Perform some operation over an array of vec3s.
	 *
	 * @param {Array} a the array of vectors to iterate over
	 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
	 * @param {Number} offset Number of elements to skip at the beginning of the array
	 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
	 * @param {Function} fn Function to call for each vector in the array
	 * @param {Object} [arg] additional argument to pass to fn
	 * @returns {Array} a
	 * @function
	 */
	vec3.forEach = (function() {
	    var vec = vec3.create();

	    return function(a, stride, offset, count, fn, arg) {
	        var i, l;
	        if(!stride) {
	            stride = 3;
	        }

	        if(!offset) {
	            offset = 0;
	        }
	        
	        if(count) {
	            l = Math.min((count * stride) + offset, a.length);
	        } else {
	            l = a.length;
	        }

	        for(i = offset; i < l; i += stride) {
	            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
	            fn(vec, vec, arg);
	            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
	        }
	        
	        return a;
	    };
	})();

	/**
	 * Get the angle between two 3D vectors
	 * @param {vec3} a The first operand
	 * @param {vec3} b The second operand
	 * @returns {Number} The angle in radians
	 */
	vec3.angle = function(a, b) {
	   
	    var tempA = vec3.fromValues(a[0], a[1], a[2]);
	    var tempB = vec3.fromValues(b[0], b[1], b[2]);
	 
	    vec3.normalize(tempA, tempA);
	    vec3.normalize(tempB, tempB);
	 
	    var cosine = vec3.dot(tempA, tempB);

	    if(cosine > 1.0){
	        return 0;
	    } else {
	        return Math.acos(cosine);
	    }     
	};

	/**
	 * Returns a string representation of a vector
	 *
	 * @param {vec3} vec vector to represent as a string
	 * @returns {String} string representation of the vector
	 */
	vec3.str = function (a) {
	    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
	};

	module.exports = vec3;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	var glMatrix = __webpack_require__(1);

	/**
	 * @class 4 Dimensional Vector
	 * @name vec4
	 */
	var vec4 = {};

	/**
	 * Creates a new, empty vec4
	 *
	 * @returns {vec4} a new 4D vector
	 */
	vec4.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = 0;
	    out[1] = 0;
	    out[2] = 0;
	    out[3] = 0;
	    return out;
	};

	/**
	 * Creates a new vec4 initialized with values from an existing vector
	 *
	 * @param {vec4} a vector to clone
	 * @returns {vec4} a new 4D vector
	 */
	vec4.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    return out;
	};

	/**
	 * Creates a new vec4 initialized with the given values
	 *
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @param {Number} w W component
	 * @returns {vec4} a new 4D vector
	 */
	vec4.fromValues = function(x, y, z, w) {
	    var out = new glMatrix.ARRAY_TYPE(4);
	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    out[3] = w;
	    return out;
	};

	/**
	 * Copy the values from one vec4 to another
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the source vector
	 * @returns {vec4} out
	 */
	vec4.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    out[2] = a[2];
	    out[3] = a[3];
	    return out;
	};

	/**
	 * Set the components of a vec4 to the given values
	 *
	 * @param {vec4} out the receiving vector
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @param {Number} z Z component
	 * @param {Number} w W component
	 * @returns {vec4} out
	 */
	vec4.set = function(out, x, y, z, w) {
	    out[0] = x;
	    out[1] = y;
	    out[2] = z;
	    out[3] = w;
	    return out;
	};

	/**
	 * Adds two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.add = function(out, a, b) {
	    out[0] = a[0] + b[0];
	    out[1] = a[1] + b[1];
	    out[2] = a[2] + b[2];
	    out[3] = a[3] + b[3];
	    return out;
	};

	/**
	 * Subtracts vector b from vector a
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.subtract = function(out, a, b) {
	    out[0] = a[0] - b[0];
	    out[1] = a[1] - b[1];
	    out[2] = a[2] - b[2];
	    out[3] = a[3] - b[3];
	    return out;
	};

	/**
	 * Alias for {@link vec4.subtract}
	 * @function
	 */
	vec4.sub = vec4.subtract;

	/**
	 * Multiplies two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.multiply = function(out, a, b) {
	    out[0] = a[0] * b[0];
	    out[1] = a[1] * b[1];
	    out[2] = a[2] * b[2];
	    out[3] = a[3] * b[3];
	    return out;
	};

	/**
	 * Alias for {@link vec4.multiply}
	 * @function
	 */
	vec4.mul = vec4.multiply;

	/**
	 * Divides two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.divide = function(out, a, b) {
	    out[0] = a[0] / b[0];
	    out[1] = a[1] / b[1];
	    out[2] = a[2] / b[2];
	    out[3] = a[3] / b[3];
	    return out;
	};

	/**
	 * Alias for {@link vec4.divide}
	 * @function
	 */
	vec4.div = vec4.divide;

	/**
	 * Returns the minimum of two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.min = function(out, a, b) {
	    out[0] = Math.min(a[0], b[0]);
	    out[1] = Math.min(a[1], b[1]);
	    out[2] = Math.min(a[2], b[2]);
	    out[3] = Math.min(a[3], b[3]);
	    return out;
	};

	/**
	 * Returns the maximum of two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {vec4} out
	 */
	vec4.max = function(out, a, b) {
	    out[0] = Math.max(a[0], b[0]);
	    out[1] = Math.max(a[1], b[1]);
	    out[2] = Math.max(a[2], b[2]);
	    out[3] = Math.max(a[3], b[3]);
	    return out;
	};

	/**
	 * Scales a vec4 by a scalar number
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the vector to scale
	 * @param {Number} b amount to scale the vector by
	 * @returns {vec4} out
	 */
	vec4.scale = function(out, a, b) {
	    out[0] = a[0] * b;
	    out[1] = a[1] * b;
	    out[2] = a[2] * b;
	    out[3] = a[3] * b;
	    return out;
	};

	/**
	 * Adds two vec4's after scaling the second operand by a scalar value
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @param {Number} scale the amount to scale b by before adding
	 * @returns {vec4} out
	 */
	vec4.scaleAndAdd = function(out, a, b, scale) {
	    out[0] = a[0] + (b[0] * scale);
	    out[1] = a[1] + (b[1] * scale);
	    out[2] = a[2] + (b[2] * scale);
	    out[3] = a[3] + (b[3] * scale);
	    return out;
	};

	/**
	 * Calculates the euclidian distance between two vec4's
	 *
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {Number} distance between a and b
	 */
	vec4.distance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1],
	        z = b[2] - a[2],
	        w = b[3] - a[3];
	    return Math.sqrt(x*x + y*y + z*z + w*w);
	};

	/**
	 * Alias for {@link vec4.distance}
	 * @function
	 */
	vec4.dist = vec4.distance;

	/**
	 * Calculates the squared euclidian distance between two vec4's
	 *
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {Number} squared distance between a and b
	 */
	vec4.squaredDistance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1],
	        z = b[2] - a[2],
	        w = b[3] - a[3];
	    return x*x + y*y + z*z + w*w;
	};

	/**
	 * Alias for {@link vec4.squaredDistance}
	 * @function
	 */
	vec4.sqrDist = vec4.squaredDistance;

	/**
	 * Calculates the length of a vec4
	 *
	 * @param {vec4} a vector to calculate length of
	 * @returns {Number} length of a
	 */
	vec4.length = function (a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2],
	        w = a[3];
	    return Math.sqrt(x*x + y*y + z*z + w*w);
	};

	/**
	 * Alias for {@link vec4.length}
	 * @function
	 */
	vec4.len = vec4.length;

	/**
	 * Calculates the squared length of a vec4
	 *
	 * @param {vec4} a vector to calculate squared length of
	 * @returns {Number} squared length of a
	 */
	vec4.squaredLength = function (a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2],
	        w = a[3];
	    return x*x + y*y + z*z + w*w;
	};

	/**
	 * Alias for {@link vec4.squaredLength}
	 * @function
	 */
	vec4.sqrLen = vec4.squaredLength;

	/**
	 * Negates the components of a vec4
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a vector to negate
	 * @returns {vec4} out
	 */
	vec4.negate = function(out, a) {
	    out[0] = -a[0];
	    out[1] = -a[1];
	    out[2] = -a[2];
	    out[3] = -a[3];
	    return out;
	};

	/**
	 * Returns the inverse of the components of a vec4
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a vector to invert
	 * @returns {vec4} out
	 */
	vec4.inverse = function(out, a) {
	  out[0] = 1.0 / a[0];
	  out[1] = 1.0 / a[1];
	  out[2] = 1.0 / a[2];
	  out[3] = 1.0 / a[3];
	  return out;
	};

	/**
	 * Normalize a vec4
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a vector to normalize
	 * @returns {vec4} out
	 */
	vec4.normalize = function(out, a) {
	    var x = a[0],
	        y = a[1],
	        z = a[2],
	        w = a[3];
	    var len = x*x + y*y + z*z + w*w;
	    if (len > 0) {
	        len = 1 / Math.sqrt(len);
	        out[0] = x * len;
	        out[1] = y * len;
	        out[2] = z * len;
	        out[3] = w * len;
	    }
	    return out;
	};

	/**
	 * Calculates the dot product of two vec4's
	 *
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @returns {Number} dot product of a and b
	 */
	vec4.dot = function (a, b) {
	    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
	};

	/**
	 * Performs a linear interpolation between two vec4's
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the first operand
	 * @param {vec4} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec4} out
	 */
	vec4.lerp = function (out, a, b, t) {
	    var ax = a[0],
	        ay = a[1],
	        az = a[2],
	        aw = a[3];
	    out[0] = ax + t * (b[0] - ax);
	    out[1] = ay + t * (b[1] - ay);
	    out[2] = az + t * (b[2] - az);
	    out[3] = aw + t * (b[3] - aw);
	    return out;
	};

	/**
	 * Generates a random vector with the given scale
	 *
	 * @param {vec4} out the receiving vector
	 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
	 * @returns {vec4} out
	 */
	vec4.random = function (out, scale) {
	    scale = scale || 1.0;

	    //TODO: This is a pretty awful way of doing this. Find something better.
	    out[0] = glMatrix.RANDOM();
	    out[1] = glMatrix.RANDOM();
	    out[2] = glMatrix.RANDOM();
	    out[3] = glMatrix.RANDOM();
	    vec4.normalize(out, out);
	    vec4.scale(out, out, scale);
	    return out;
	};

	/**
	 * Transforms the vec4 with a mat4.
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the vector to transform
	 * @param {mat4} m matrix to transform with
	 * @returns {vec4} out
	 */
	vec4.transformMat4 = function(out, a, m) {
	    var x = a[0], y = a[1], z = a[2], w = a[3];
	    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
	    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
	    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
	    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
	    return out;
	};

	/**
	 * Transforms the vec4 with a quat
	 *
	 * @param {vec4} out the receiving vector
	 * @param {vec4} a the vector to transform
	 * @param {quat} q quaternion to transform with
	 * @returns {vec4} out
	 */
	vec4.transformQuat = function(out, a, q) {
	    var x = a[0], y = a[1], z = a[2],
	        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

	        // calculate quat * vec
	        ix = qw * x + qy * z - qz * y,
	        iy = qw * y + qz * x - qx * z,
	        iz = qw * z + qx * y - qy * x,
	        iw = -qx * x - qy * y - qz * z;

	    // calculate result * inverse quat
	    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
	    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
	    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
	    out[3] = a[3];
	    return out;
	};

	/**
	 * Perform some operation over an array of vec4s.
	 *
	 * @param {Array} a the array of vectors to iterate over
	 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
	 * @param {Number} offset Number of elements to skip at the beginning of the array
	 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
	 * @param {Function} fn Function to call for each vector in the array
	 * @param {Object} [arg] additional argument to pass to fn
	 * @returns {Array} a
	 * @function
	 */
	vec4.forEach = (function() {
	    var vec = vec4.create();

	    return function(a, stride, offset, count, fn, arg) {
	        var i, l;
	        if(!stride) {
	            stride = 4;
	        }

	        if(!offset) {
	            offset = 0;
	        }
	        
	        if(count) {
	            l = Math.min((count * stride) + offset, a.length);
	        } else {
	            l = a.length;
	        }

	        for(i = offset; i < l; i += stride) {
	            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
	            fn(vec, vec, arg);
	            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
	        }
	        
	        return a;
	    };
	})();

	/**
	 * Returns a string representation of a vector
	 *
	 * @param {vec4} vec vector to represent as a string
	 * @returns {String} string representation of the vector
	 */
	vec4.str = function (a) {
	    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
	};

	module.exports = vec4;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE. */

	var glMatrix = __webpack_require__(1);

	/**
	 * @class 2 Dimensional Vector
	 * @name vec2
	 */
	var vec2 = {};

	/**
	 * Creates a new, empty vec2
	 *
	 * @returns {vec2} a new 2D vector
	 */
	vec2.create = function() {
	    var out = new glMatrix.ARRAY_TYPE(2);
	    out[0] = 0;
	    out[1] = 0;
	    return out;
	};

	/**
	 * Creates a new vec2 initialized with values from an existing vector
	 *
	 * @param {vec2} a vector to clone
	 * @returns {vec2} a new 2D vector
	 */
	vec2.clone = function(a) {
	    var out = new glMatrix.ARRAY_TYPE(2);
	    out[0] = a[0];
	    out[1] = a[1];
	    return out;
	};

	/**
	 * Creates a new vec2 initialized with the given values
	 *
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @returns {vec2} a new 2D vector
	 */
	vec2.fromValues = function(x, y) {
	    var out = new glMatrix.ARRAY_TYPE(2);
	    out[0] = x;
	    out[1] = y;
	    return out;
	};

	/**
	 * Copy the values from one vec2 to another
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the source vector
	 * @returns {vec2} out
	 */
	vec2.copy = function(out, a) {
	    out[0] = a[0];
	    out[1] = a[1];
	    return out;
	};

	/**
	 * Set the components of a vec2 to the given values
	 *
	 * @param {vec2} out the receiving vector
	 * @param {Number} x X component
	 * @param {Number} y Y component
	 * @returns {vec2} out
	 */
	vec2.set = function(out, x, y) {
	    out[0] = x;
	    out[1] = y;
	    return out;
	};

	/**
	 * Adds two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.add = function(out, a, b) {
	    out[0] = a[0] + b[0];
	    out[1] = a[1] + b[1];
	    return out;
	};

	/**
	 * Subtracts vector b from vector a
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.subtract = function(out, a, b) {
	    out[0] = a[0] - b[0];
	    out[1] = a[1] - b[1];
	    return out;
	};

	/**
	 * Alias for {@link vec2.subtract}
	 * @function
	 */
	vec2.sub = vec2.subtract;

	/**
	 * Multiplies two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.multiply = function(out, a, b) {
	    out[0] = a[0] * b[0];
	    out[1] = a[1] * b[1];
	    return out;
	};

	/**
	 * Alias for {@link vec2.multiply}
	 * @function
	 */
	vec2.mul = vec2.multiply;

	/**
	 * Divides two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.divide = function(out, a, b) {
	    out[0] = a[0] / b[0];
	    out[1] = a[1] / b[1];
	    return out;
	};

	/**
	 * Alias for {@link vec2.divide}
	 * @function
	 */
	vec2.div = vec2.divide;

	/**
	 * Returns the minimum of two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.min = function(out, a, b) {
	    out[0] = Math.min(a[0], b[0]);
	    out[1] = Math.min(a[1], b[1]);
	    return out;
	};

	/**
	 * Returns the maximum of two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec2} out
	 */
	vec2.max = function(out, a, b) {
	    out[0] = Math.max(a[0], b[0]);
	    out[1] = Math.max(a[1], b[1]);
	    return out;
	};

	/**
	 * Scales a vec2 by a scalar number
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to scale
	 * @param {Number} b amount to scale the vector by
	 * @returns {vec2} out
	 */
	vec2.scale = function(out, a, b) {
	    out[0] = a[0] * b;
	    out[1] = a[1] * b;
	    return out;
	};

	/**
	 * Adds two vec2's after scaling the second operand by a scalar value
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @param {Number} scale the amount to scale b by before adding
	 * @returns {vec2} out
	 */
	vec2.scaleAndAdd = function(out, a, b, scale) {
	    out[0] = a[0] + (b[0] * scale);
	    out[1] = a[1] + (b[1] * scale);
	    return out;
	};

	/**
	 * Calculates the euclidian distance between two vec2's
	 *
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {Number} distance between a and b
	 */
	vec2.distance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1];
	    return Math.sqrt(x*x + y*y);
	};

	/**
	 * Alias for {@link vec2.distance}
	 * @function
	 */
	vec2.dist = vec2.distance;

	/**
	 * Calculates the squared euclidian distance between two vec2's
	 *
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {Number} squared distance between a and b
	 */
	vec2.squaredDistance = function(a, b) {
	    var x = b[0] - a[0],
	        y = b[1] - a[1];
	    return x*x + y*y;
	};

	/**
	 * Alias for {@link vec2.squaredDistance}
	 * @function
	 */
	vec2.sqrDist = vec2.squaredDistance;

	/**
	 * Calculates the length of a vec2
	 *
	 * @param {vec2} a vector to calculate length of
	 * @returns {Number} length of a
	 */
	vec2.length = function (a) {
	    var x = a[0],
	        y = a[1];
	    return Math.sqrt(x*x + y*y);
	};

	/**
	 * Alias for {@link vec2.length}
	 * @function
	 */
	vec2.len = vec2.length;

	/**
	 * Calculates the squared length of a vec2
	 *
	 * @param {vec2} a vector to calculate squared length of
	 * @returns {Number} squared length of a
	 */
	vec2.squaredLength = function (a) {
	    var x = a[0],
	        y = a[1];
	    return x*x + y*y;
	};

	/**
	 * Alias for {@link vec2.squaredLength}
	 * @function
	 */
	vec2.sqrLen = vec2.squaredLength;

	/**
	 * Negates the components of a vec2
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a vector to negate
	 * @returns {vec2} out
	 */
	vec2.negate = function(out, a) {
	    out[0] = -a[0];
	    out[1] = -a[1];
	    return out;
	};

	/**
	 * Returns the inverse of the components of a vec2
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a vector to invert
	 * @returns {vec2} out
	 */
	vec2.inverse = function(out, a) {
	  out[0] = 1.0 / a[0];
	  out[1] = 1.0 / a[1];
	  return out;
	};

	/**
	 * Normalize a vec2
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a vector to normalize
	 * @returns {vec2} out
	 */
	vec2.normalize = function(out, a) {
	    var x = a[0],
	        y = a[1];
	    var len = x*x + y*y;
	    if (len > 0) {
	        //TODO: evaluate use of glm_invsqrt here?
	        len = 1 / Math.sqrt(len);
	        out[0] = a[0] * len;
	        out[1] = a[1] * len;
	    }
	    return out;
	};

	/**
	 * Calculates the dot product of two vec2's
	 *
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {Number} dot product of a and b
	 */
	vec2.dot = function (a, b) {
	    return a[0] * b[0] + a[1] * b[1];
	};

	/**
	 * Computes the cross product of two vec2's
	 * Note that the cross product must by definition produce a 3D vector
	 *
	 * @param {vec3} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @returns {vec3} out
	 */
	vec2.cross = function(out, a, b) {
	    var z = a[0] * b[1] - a[1] * b[0];
	    out[0] = out[1] = 0;
	    out[2] = z;
	    return out;
	};

	/**
	 * Performs a linear interpolation between two vec2's
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the first operand
	 * @param {vec2} b the second operand
	 * @param {Number} t interpolation amount between the two inputs
	 * @returns {vec2} out
	 */
	vec2.lerp = function (out, a, b, t) {
	    var ax = a[0],
	        ay = a[1];
	    out[0] = ax + t * (b[0] - ax);
	    out[1] = ay + t * (b[1] - ay);
	    return out;
	};

	/**
	 * Generates a random vector with the given scale
	 *
	 * @param {vec2} out the receiving vector
	 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
	 * @returns {vec2} out
	 */
	vec2.random = function (out, scale) {
	    scale = scale || 1.0;
	    var r = glMatrix.RANDOM() * 2.0 * Math.PI;
	    out[0] = Math.cos(r) * scale;
	    out[1] = Math.sin(r) * scale;
	    return out;
	};

	/**
	 * Transforms the vec2 with a mat2
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to transform
	 * @param {mat2} m matrix to transform with
	 * @returns {vec2} out
	 */
	vec2.transformMat2 = function(out, a, m) {
	    var x = a[0],
	        y = a[1];
	    out[0] = m[0] * x + m[2] * y;
	    out[1] = m[1] * x + m[3] * y;
	    return out;
	};

	/**
	 * Transforms the vec2 with a mat2d
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to transform
	 * @param {mat2d} m matrix to transform with
	 * @returns {vec2} out
	 */
	vec2.transformMat2d = function(out, a, m) {
	    var x = a[0],
	        y = a[1];
	    out[0] = m[0] * x + m[2] * y + m[4];
	    out[1] = m[1] * x + m[3] * y + m[5];
	    return out;
	};

	/**
	 * Transforms the vec2 with a mat3
	 * 3rd vector component is implicitly '1'
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to transform
	 * @param {mat3} m matrix to transform with
	 * @returns {vec2} out
	 */
	vec2.transformMat3 = function(out, a, m) {
	    var x = a[0],
	        y = a[1];
	    out[0] = m[0] * x + m[3] * y + m[6];
	    out[1] = m[1] * x + m[4] * y + m[7];
	    return out;
	};

	/**
	 * Transforms the vec2 with a mat4
	 * 3rd vector component is implicitly '0'
	 * 4th vector component is implicitly '1'
	 *
	 * @param {vec2} out the receiving vector
	 * @param {vec2} a the vector to transform
	 * @param {mat4} m matrix to transform with
	 * @returns {vec2} out
	 */
	vec2.transformMat4 = function(out, a, m) {
	    var x = a[0], 
	        y = a[1];
	    out[0] = m[0] * x + m[4] * y + m[12];
	    out[1] = m[1] * x + m[5] * y + m[13];
	    return out;
	};

	/**
	 * Perform some operation over an array of vec2s.
	 *
	 * @param {Array} a the array of vectors to iterate over
	 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
	 * @param {Number} offset Number of elements to skip at the beginning of the array
	 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
	 * @param {Function} fn Function to call for each vector in the array
	 * @param {Object} [arg] additional argument to pass to fn
	 * @returns {Array} a
	 * @function
	 */
	vec2.forEach = (function() {
	    var vec = vec2.create();

	    return function(a, stride, offset, count, fn, arg) {
	        var i, l;
	        if(!stride) {
	            stride = 2;
	        }

	        if(!offset) {
	            offset = 0;
	        }
	        
	        if(count) {
	            l = Math.min((count * stride) + offset, a.length);
	        } else {
	            l = a.length;
	        }

	        for(i = offset; i < l; i += stride) {
	            vec[0] = a[i]; vec[1] = a[i+1];
	            fn(vec, vec, arg);
	            a[i] = vec[0]; a[i+1] = vec[1];
	        }
	        
	        return a;
	    };
	})();

	/**
	 * Returns a string representation of a vector
	 *
	 * @param {vec2} vec vector to represent as a string
	 * @returns {String} string representation of the vector
	 */
	vec2.str = function (a) {
	    return 'vec2(' + a[0] + ', ' + a[1] + ')';
	};

	module.exports = vec2;


/***/ }
/******/ ])
});
;
