APP_VERSION = '1.9.15 (TEST)';

PW_VERSION = '1.9';

window.addEventListener('DOMContentLoaded',() => {
	
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
		
		this.awaiting = new Object();
		
		this.events = (events) ? events : new Object();
		
	}
	
	async init(){
		
		await this.connect();
		
	}
	
	async connect(){
		
		this.WebSocket = new WebSocket(`${this.host}`); // + ${App.storage.data.token}
		
		this.WebSocket.addEventListener('message', (event) => this.message(event.data) );
		
		this.WebSocket.addEventListener('close', async () => {
			
			try{
				
				await this.connect();
				
			}
			catch(error){
				
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
				console.log('EVENNNNEETTT',action,data);
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
	
	async say(request,object,method,data = ''){
		
		this.WebSocket.send(JSON.stringify({token:App.storage.data.token,request:request,object:object,method:method,data:data,version:APP_VERSION}));
		
	}
	
}

class View {
	
	static activeTemplate = false;
	
	static activeAnimation = false;
	
	static defaultAnimation = {transform:['scale(1.1)','scale(1)'],opacity:[0,1],backdropFilter:['blur(0)','blur(15px)']};
	
	static defaultOptionAnimation = {duration:150,fill:'both',easing:'ease-out'};
	
	static setCss(name = 'style.css'){
		
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
		
		return DOM({style:'login_box'},DOM({style:'login-box-forma'},DOM({tag:'div'},DOM({tag:'img',style:'login-box-forma-logo',src:'logo_classic.png'})),
		
		DOM({style:'login-box-forma-inputs'},
		login,
		password,
		DOM({style:'login-box-forma-buttons'},DOM({tag:'div',style:'login-box-forma-button',event:['click',() => App.authorization(login,password)]},'Войти'),DOM({tag:'div',style:'login-box-forma-button',event:['click',() => {
			
			View.show('registration');
			
		}]},'Регистрация'))
		)),DOM({style:'author'},`Launcher v.${APP_VERSION} | Prime World v.${PW_VERSION}`));
		
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
		DOM({tag:'div'},DOM({tag:'img',style:'login-box-forma-logo',src:'logo_classic.png'}))
		
		),DOM({style:'author'},`Версия ${APP_VERSION} by ifst.`));
		
	}
	
	static castle(){
		
		// View.setCss('castle.css');
		
		let canvas = DOM({tag:'canvas',style:'body-canvas'});
		
		// App.storage.data.fraction; тут будет инфа о стороне 1 или 2 
		
		canvas.style.width = '100vw';
		
		canvas.style.height = '100vh';
		
		return canvas;
		
	}
	
	static header(){
		
		let play = MM.play();
		
		play.classList.add('main-header-item');
		
		play.classList.add('button-play');
		
		let menu = DOM({style:'main-header'},DOM({tag:'img',src:'logo.png',event:['click',() => View.show('main')]}),play);
		
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
		DOM({style:'main-header-item',event:['click',() => View.show('main')]},'Лобби'),
		DOM({style:'main-header-item',event:['click',() => View.show('builds')]},'Билды'),
		DOM({style:'main-header-item',event:['click',() => View.show('history')]},'История'),
		DOM({style:'main-header-item',event:['click',() => View.show('top')]},'Рейтинг'),
		DOM({style:'main-header-item',event:['click',() => View.show('game')]},'Фарм'),
		DOM({style:'main-header-item',event:['click',() => App.exit()]},'[X]')
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
				
				rank.style.backgroundImage = `url(ransk/${Rank.icon(player.rating)}.png)`;
				
				let hero = DOM({style:'top-item-hero'},rank);
				
				hero.style.backgroundImage = `url(hero/${player.hero}/${player.skin ? player.skin : 1}.png)`;
				
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
			
			rankIcon.style.backgroundImage = `url(ransk/${Rank.icon(item.rating)}.png)`;
			
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
						
						if(!await Protect.checkInstall()){
							
							App.error('Проверка');
							
							return;
							
						}
						
						await App.api.request('mmtest','readyParty',{id:MM.partyId});
						
						status.onclick = false;
						
					}
					
					status.innerText = 'Подтвердить';
					
				}
				
				img.style.backgroundImage = (item.hero) ? `url(hero/${item.hero}/${item.skin ? item.skin : 1}.png)` : `url(hero/empty-ru.avif)`;
				
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
					
					View.show('main');
					
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
							
							hero.dataset.url = `hero/${item.id}/${item.skin ? item.skin : 1}.png`;
							
						}
						else{
							
							hero.dataset.url = `hero/empty-ru.avif`;
							
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
			
			hero.style.backgroundImage = `url(hero/${item.hero}/${item.skin ? item.skin : 1}.png)`;
			
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
					
					hero.dataset.url = `hero/${item.id}/${item.skin ? item.skin : 1}.png`;
					
				}
				else{
					
					hero.dataset.url = `hero/empty-ru.avif`;
					
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
		
		top.firstChild.firstChild.style.backgroundImage = `url(hero/${result[0].hero}/${result[0].skin ? result[0].skin : 1}.png)`;
		
		top.firstChild.lastChild.innerText = `#1. ${result[0].nickname}`;
		
		let number = 1;
		
		for(let player of result){
			
			let rank = DOM({style:'top-item-hero-rank'});
			
			rank.style.backgroundImage = `url(ransk/${Rank.icon(player.rating)}.png)`;
			
			let hero = DOM({style:'top-item-hero'},rank);
			
			hero.style.backgroundImage = `url(hero/${player.hero}/${player.skin ? player.skin : 1}.png)`;
			
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
					
					twoSlide.style.backgroundImage = `url("hero/${element.dataset.id}/${element.dataset.slide}.png")`;
					
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
					
				},`hero/${element.dataset.id}/${element.dataset.slide}.png`);
				
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
				
				rankIcon.style.backgroundImage = `url(ransk/${Rank.icon(item.rating)}.png)`;
				
				let rank = DOM({style:'rank'},DOM({style:'rank-lvl'},item.rating),rankIcon);
				
				const hero = DOM({style:'hero-item'},DOM({tag:'span', style: 'name'},item.name),rank);
				
				hero.addEventListener('click',() => View.show('build',item.id));
				
				hero.dataset.id = item.id;
				
				hero.dataset.slide = 1;
				
				hero.dataset.total = item.total;
				
				hero.dataset.url = `hero/${item.id}/${item.skin ? item.skin : 1}.png`;
				
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
				
				unit.style.backgroundImage = `url(talents/${item.id}.png)`;
				
				unit.append(DOM({tag:'span'},item.score));
				
				inventory.append(unit);
				
			}
			
		},'gamev2','inventory');
		

		body.append(DOM({style:'main-header'},
		DOM({tag:'img',src:'logo.png'}),
		DOM({style:'main-header-item',event:['click',() => View.show('main')]},App.storage.data.login),
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
				
				View.show('main');
				
			}
			
			request.finish = async () => {
				
				if(!confirm('Завершить фарм?')){
					
					return;
					
				}
				
				await App.api.request('gamev2','finish');
				
				View.show('main');
				
			}
			
			request.exit = () => {
				
				View.show('main');
				
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
		DOM({style:'game-button',event:['click',() => View.show('main')]},'Назад')
		);
		
		body.append(dscription);
		
		return body;
		
	}
	
	static async build(heroId,targetId = 0){
		
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
		
		let body = DOM({style:'main'}), adm = DOM({style:'adm'},DOM({event:['click',() => View.show('main')]},'[X]'));
		
		let result = await App.api.request('build','talentAll');
		
		for(let item of result){
			
			let div = DOM({tag:'div'});
			
			div.append(DOM(`id${item.id}`),DOM({tag:'img',src:`talents/${item.id}.png`}));
			
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
		
		let body = DOM({style:'main'}), adm = DOM({style:'adm'},DOM({event:['click',() => View.show('main')]},'[X]'));
		
		let result = await App.api.request('build','talentHeroAll');
		
		for(let item of result){
			
			let div = DOM({tag:'div'});
			
			div.append(DOM(`id${item.id}`),DOM({tag:'img',src:`htalents/${item.id}.png`}));
			
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
		
		let body = DOM({style:'main'}), adm = DOM({style:'adm'},DOM({event:['click',() => View.show('main')]},'[X]'));
		
		let result = await App.api.request('user','all');
		
		for(let item of result){
			
			let div = DOM({tag:'div'});
			
			div.append(DOM(`id${item.id}`),DOM(`inv ${item.invite}`));
			
			for(let key in item){
				
				if(['id','invite'].includes(key)){
					
					continue;
					
				}
				
				if(key == 'added'){
					
					div.append(DOM(`${new Date(item.added).toLocaleString('ru-RU')}`));
					
					continue;
					
				}
				
				div.append(DOM({tag:'div'},key),App.input( async (value) => {
					
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
			
		}));
		
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
				
				talent.style.backgroundImage = (item > 0) ? `url(talents/${item}.png)` : `url(htalents/${Math.abs(item)}.png)`;
				
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

	static skinChange(){
		
		let bodyHero = DOM({style:'skin-change'});
		
		let preload = new PreloadImages(bodyHero);
		
		for(let i = 0; i < Build.dataRequest.hero.skin.total; i++){
			
			let hero = DOM();
			
			hero.dataset.url = `hero/${Build.heroId}/${(i + 1)}.png`;
			
			hero.dataset.skin = (i + 1);
			
			hero.addEventListener('click', async () => {
				
				await App.api.request('build','skinChange',{hero:Build.heroId,skin:hero.dataset.skin});
				
				Build.heroImg.style.backgroundImage = `url(hero/${Build.heroId}/${hero.dataset.skin}.png)`;
				
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
		};
		
		if( !('profile' in Build.dataRequest) ){
			
			Build.dataRequest.profile = [0,0,0,0,0,0,0,0,0];
			
		}
		
		let i = 0;

		const cond = key =>
			['damage', 'critProb', 'attackSpeed', 'punching', 'protectionBody', 'protectionSpirit'].includes(key);
		
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
						Build.removeSortInventory('stats','speedtal');
						Build.removeSortInventory('stats','speedtalrz');
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
						Build.setSortInventory('stats','speedtal');
						Build.setSortInventory('stats','speedtalrz');
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
			
			item.dataset.active = 0;
			if (cond(key)) {
				item.classList.add('passive');
			}
			
			Build.dataStats[key] = item;
		
			if (!['hp', 'mp', 'speed', 'damage', 'critProb', 'attackSpeed', 'punching', 'protectionBody', 'protectionSpirit'].includes(key)) {
				const daw = DOM({tag: 'img', style:'build-hero-stats-daw', title: 'Сделать характеристику приоритетной', event:['click', async () => {
					
					if(daw.dataset.status != 0){
						
						await App.api.request('build','setProfile',{id:Build.id,index:daw.dataset.index,value:false});
						
						daw.dataset.status = 0;
						daw.src = 'circle.png';
						
						Build.profileStats[key] = 0;

						Build.updateHeroStats();
					}
					else{
						
						await App.api.request('build','setProfile',{id:Build.id,index:daw.dataset.index,value:true});
						
						daw.dataset.status = 1;
						daw.src = 'checkbox.png';
						
						Build.profileStats[key] = 1;

						Build.updateHeroStats();
					}
				}]});
				
				daw.dataset.index = i;
				
				daw.dataset.status = Build.dataRequest.profile[i];
				
				Build.profileStats[key] = parseInt(daw.dataset.status);
				
				if(daw.dataset.status == 1){
					daw.src = 'checkbox.png';
				} else {
					daw.src = 'circle.png';
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
		
		Build.heroImg.style.backgroundImage = `url(hero/${data.id}/${Build.dataRequest.hero.skin.target ? Build.dataRequest.hero.skin.target : 1}.png)`;
		
		let rankIcon = DOM({style:'rank-icon'});
		
		rankIcon.style.backgroundImage = `url(ransk/${Rank.icon(data.rating)}.png)`;
		
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
			Build.dataStats['critProb'].lastChild.innerText = Math.round(crit) + '%';
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
			
		// Apply animation and change stats in Build.calculationStats
		for(let key2 in add){
			
			if( !(key2 in Build.dataStats) ){
				
				continue;
				
			}
			
			if (key2 in Build.calculationStats) {
				let statChange = parseFloat(add[key2]);
				Build.calculationStats[key2] += fold ? statChange : -statChange;
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

		data.params = data.txtNum ? data.txtNum : data.params; //"all,8,74,num,razum";
		
		Build.talents[data.id] = data;
		
		talent.dataset.id = data.id;

		talent.dataset.active = data.active;
		
		talent.dataset.state = data.state;
		
		talent.dataset.url = (data.id > 0) ? `talents/${data.id}.png` : `htalents/${Math.abs(data.id)}.png`;
		
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
		reset.src = 'trash.svg';
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
			
			document.onmousemove = (e) => {
				
				element.style.left = e.pageX - shiftX - 5 + 'px';
				
				element.style.top = e.pageY - shiftY - 5 + 'px';
				
			}
			
			element.onmouseup = async (event) => {

				let moveEnd = Date.now();
				let isClick = moveEnd - moveStart < 100;
				
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
						if (key == 'speed' || key == 'speedrz' || key == 'speedvz') {
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
				for (let specialTag of innerChilds) {
					if (specialTag.innerHTML != '%s' || !data.params) {
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

					function lerp( a, b, alpha ) {
						return a + alpha * ( b - a );
					}

					if (resolvedStatAffection in Build.dataStats && paramValues.length == 5) {
						let resolvedTotalStat = Build.totalStat(resolvedStatAffection);
						const isHpOrEnergy = resolvedStatAffection == 'hp' || resolvedStatAffection == 'mp';
						const param1 = isHpOrEnergy ? 600.0 : 50.0;
						const param2 = isHpOrEnergy ? 6250.0 : 250.0;
						specialTag.innerHTML = Math.round(lerp(minValue, maxValue, (resolvedTotalStat - param1) / param2));
					} else {
						let refineBonus = Build.getTalentRefineByRarity(data.rarity);
						specialTag.innerHTML = Math.round(minValue + maxValue * refineBonus);
					}
					
					paramIterator++;
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
		
		MM.ready(data);
		
	}
	
	static MMReadyCount(data){
		
		let find = document.getElementById('MMReady');
		
		if(find){
			
			find.innerText = `${data.count}/10`
			
		}
		
	}
	
	static MMStart(data){
		
		MM.lobby(data);
		
	}
	
	static MMChangeHero(data){
		
		MM.eventChangeHero(data);
		
	}
	
	static MMChat(data){
		
		MM.chat(data);
		
	}
	
	static MMHero(data){
		
		MM.select(data);
		
	}
	
	static MMEnd(data){
		
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
		
		View.show('main',data);
		
	}
	
	static PHero(data){
		
		let find = document.getElementById(`PP${data.id}`);
		
		if(find){
			
			find.children[1].style.backgroundImage = (data.hero) ? `url(hero/${data.hero}/${data.skin ? data.skin : 1}.png)` : `url(hero/empty-ru.avif)`;
			
			find.children[1].firstChild.children[0].innerText = data.rating;
			
			find.children[1].firstChild.children[1].style.backgroundImage = `url(ransk/${Rank.icon(data.rating)}.png)`;
			
		}
		
	}
	
	static PExit(){
		
		View.show('main');
		
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
		
		console.log('stat',data);
		
		document.getElementById('STAT').innerText = `Онлайн: ${data.online}, Матчмейкинг (очередь): ${data.player}, Пати: ${data.party} | Лаунчер v.${APP_VERSION} | PW v.${PW_VERSION}`
		
	}
	
	static MMKick(data){
		
		setTimeout(() => {
			
			MM.searchActive(false);
			
		},1000);
		
		let body = document.createDocumentFragment();
		
		let button = DOM({style:'splash-content-button',event:['click', async () => Splash.hide()]},'Больше так не буду');
		
		body.append(DOM(`${data.party ? 'Один из участников пати был АФК, поэтому вы исключены из подбора матча' : 'Вы были исключены из матчмейкинга за АФК!'}`),button)
		
		Splash.show(body);
		
	}

}

class App {
	
	static async init(){
		
		Splash.init();
		
		// ws://192.168.31.194:3737
		App.api = new Api('wss://playpw.fun:443/api/v1/',Events); // wss://playpw.fun:443/api/v1/
		
		await Store.init();
		
		App.storage = new Store('u1');
		
		await App.storage.init({id:0,token:'',login:''});
		
		await Protect.init();
		
		await MM.init();
		
		if(App.storage.data.login){
			
			await App.api.init();
			
			if(window.location.hash == '#castle'){
				
				View.show('castle');
				
			}
			else{
				
				View.show('main');
				
			}
			
		}
		else{
			
			App.api.init();
			
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
		
		await App.storage.set({id:request.id,token:request.token,login:login.value});
		
		View.show('main');
		
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

		await App.storage.set({id:request.id,token:request.token,login:login.value});
		
		View.show('main');
		
	}
	
	static async exit(){
		
		await App.storage.set({token:'',login:''});
		
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
	
	static scrollHorizontally(e) {

    var scrollPos = this.scrollLeft;  // Сколько прокручено по горизонтали, до прокрутки (не перемещать эту строку!)

    // Горизонтальная прокрутка
    e = window.event || e;
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
    this.scrollLeft -= (delta*100); // Multiplied by 10

    var widthElem = this.scrollWidth; // Ширина всего элемента
    var widthBrowser = document.documentElement.clientWidth;  // Ширина окна минус размер вертикального скролла


    // Прокрутка вверх, но элемент уже в крайней левой позиции, то двигаемся вверх
    if ((delta == 1 ) && (this.scrollLeft == 0)) return;
    // Прокрутка вниз, но элемент виден полностью. Или элемент до конца прокручен в правый край
    if ((widthBrowser >= widthElem) || (scrollPos == this.scrollLeft)) return;

    e.preventDefault(); // запрещает прокрутку по вертикали

  }
  
 	static getRandomInt(min,max){
		
		min = Math.ceil(min);
		
		max = Math.floor(max);
		
		return Math.floor(Math.random() * (max - min + 1)) + min;
		
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
	
	static isAdmin(){
		
		return [1,2,24,134,2220].includes(Number(App.storage.data.id));
		
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
	
	static async init(){
		
		MM.view.classList.add('mm');
		
		MM.view.style.display = 'none';
		
		document.body.append(MM.view);
		
		MM.button.innerText = 'В бой!';
		
		MM.button.onclick = () => MM.start();
		
		Timer.init();
		
	}
	
	static soundEvent(){
		
		let audio = new Audio();
		
		audio.preload = 'auto';
		
		audio.src = 'found.mp3';
		
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
		/*
		if(!await Protect.checkInstall()){
			
			MM.button.innerText = 'Проверка';
			
			setTimeout(() => {
				
				MM.button.innerText = 'В бой!';
				
			},5000);
			
			return;
			
		}
		*/
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
			
			try{
				
				let request = await App.api.request('mmtest','start',{hero:MM.activeSelectHero,version:PW_VERSION});
				
				MM.id = request.id;
				
				if(request.type == 'reconnect'){
					
					let reconnect = DOM({tag:'a',href:`pwclassic://reconnect/${request.id}/${PW_VERSION}`});
		
					reconnect.click();
					
					return;
					
				}
				
			}
			catch(error){
				
				return App.error(error);
				
			}
			
			MM.searchActive(true);
			
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
			
			await App.api.request('mmtest','hero',{id:MM.id,heroId:MM.targetHeroId});
			
		}]},'Подтвердить');
		
		MM.lobbyConfirm.style.opacity = 0;
		
		MM.lobbyConfirm.style.width = '50%';
		
		MM.lobbyConfirm.animate({transform:['scale(1)','scale(0.8)','scale(1.2)','scale(1)']},{duration:500,iterations:Infinity,easing:'ease-in-out'});
		
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
			
			rankIcon.style.backgroundImage = `url(ransk/${Rank.icon(data.users[key].rating)}.png)`;
			
			let rank = DOM({style:'rank'},DOM({style:'rank-lvl'},data.users[key].rating),rankIcon);
			
			hero.append(rank);
			
			hero.style.backgroundImage = (data.users[key].hero) ? `url(hero/${data.users[key].hero}/1.png)` : `url(hero/empty.png)`;
			
			player.append(hero,name);
			
			if(key == data.target) {
				
				MM.lobbyPlayerAnimate = player.animate({transform:['scale(1)','scale(0.9)','scale(1.1)','scale(1)']},{duration:3500,iterations:Infinity,easing:'ease-in-out'});
				
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
				
				name.style.opacity = 0;
				
				rightTeam.append(player);
				
			}

		}
		
		MM.lobbyHeroes = DOM({style:'mm-lobby-middle-hero'});
		
		let preload = new PreloadImages(MM.lobbyHeroes);
		
		for(let item of MM.hero){
			
			let hero = DOM({id:`HERO${item.id}`,data:{ban:0}});

			hero.dataset.url = `hero/${item.id}/1.png`;
			
			hero.onclick = async () => {
				//Sound.play(`hero/${item.id}/revive/${App.getRandomInt(1,4)}.mp3`); // тест
				//return;
				MM.targetHeroId = item.id;
				
				await App.api.request('mmtest','eventChangeHero',{id:MM.id,heroId:item.id});
				
				MM.lobbyBuildView(MM.targetHeroId);
				
			}
			
			let rankIcon = DOM({style:'rank-icon'});
			
			rankIcon.style.backgroundImage = `url(ransk/${Rank.icon(item.rating)}.png)`;
			
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
		
		Sound.play('tambur.mp3',{id:'tambur',volume:0.50,loop:true});
		
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
		
		Sound.play(`hero/${data.heroId}/revive/${data.sound}.mp3`,{volume:0.75});
		
		MM.lobbyPlayerAnimate.cancel();
		
		await Timer.start(data.id,'',() => {
			
			MM.close();
			
			MM.searchActive(true);
			
		});
		
		let findOldPlayer = document.getElementById(`PLAYER${data.userId}`);
		
		if(findOldPlayer){
			
			findOldPlayer.dataset.hero = data.heroId;
			
			findOldPlayer.firstChild.style.backgroundImage = `url(hero/${data.heroId}/1.png)`;
			
			findOldPlayer.firstChild.firstChild.firstChild.innerText = data.rating;
			
			findOldPlayer.firstChild.firstChild.lastChild.style.backgroundImage = `url(ransk/${Rank.icon(data.rating)}.png)`;
			
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
		
		let play = DOM({tag:'a',href:`pwclassic://runGame/${data.key}/${PW_VERSION}`});
		
		play.click();
		
		View.show('main');
		
	}
	
	static eventChangeHero(data){
		
		let findPlayer = document.getElementById(`PLAYER${data.id}`);
		
		if(findPlayer){
			
			findPlayer.dataset.hero = data.heroId;
			
			findPlayer.firstChild.style.backgroundImage = `url(hero/${data.heroId}/1.png)`;
			
			findPlayer.firstChild.firstChild.firstChild.innerText = data.rating;
			
			findPlayer.firstChild.firstChild.lastChild.style.backgroundImage = `url(ransk/${Rank.icon(data.rating)}.png)`;
			
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
	
	static play(source,object = new Object()){
		
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
			
			unit.style.backgroundImage = `url(talents/${id}.png)`;
			
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
		
		unit.style.backgroundImage = `url(talents/${id}.png)`;
		
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
		
		unit.style.backgroundImage = `url(talents/763.png)`;
		
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

