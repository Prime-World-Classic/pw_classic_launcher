APP_VERSION = '1.5.0';

PW_VERSION = '1.5';

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
	
	static async main(data){
		
		let body = DOM({style:'main'});
		
		let play = MM.play();
		
		play.classList.add('main-header-item');
		
		play.classList.add('button-play');
		
		let middle = DOM({style:'party-middle'});
		
		let party = DOM({style:'party'},middle);
		
		let players = new Array();
		
		data = (data) ? data : await App.api.request('mm','loadParty');
		
		MM.partyId = data.id;
		
		MM.activeSelectHero = data.users[App.storage.data.id].hero;
		
		MM.searchActive(data.users[MM.partyId].ready);
		
		for(let key in data.users){
			
			players.push({id:key,hero:data.users[key].hero,nickname:data.users[key].nickname,ready:data.users[key].ready});
			
		}
		/*
		if(!players.length){
			
			players.push({id:App.storage.data.id,hero:MM.storage.data.hero,nickname:App.storage.data.login,ready:0});
			
		}
		*/
		if(players.length < 5){
			
			while(players.length < 5){
				
				players.push({id:0,hero:0,nickname:'',ready:0});
				
			}
			
		}
		
		for(let item of players){
			
			let img = DOM({style:'party-middle-item-middle'});
			
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
						
						await App.api.request('mm','readyParty',{id:MM.partyId});
						
						status.onclick = false;
						
					}
					
					status.innerText = 'Подтвердить';
					
				}
				
				img.style.backgroundImage = (item.hero) ? `url(hero/${item.hero}/1.png)` : `url(hero/empty-ru.avif)`;
				
			}
			else{
				
				img.innerText = '+';
				
				status.style.opacity = 0;
				
			}
			
			let nickname = DOM(`${item.nickname ? item.nickname : 'Добавить'}`);
			
			let player = DOM({id:`PP${item.id}`,style:'party-middle-item'},nickname,img,status);
			
			player.dataset.id = item.id;
			
			if( (MM.partyId == App.storage.data.id) && (player.dataset.id != App.storage.data.id) && (player.dataset.id != 0) ){
				
				nickname.append(DOM({tag:'span',event:['click', async () => {
					
					await App.api.request('mm','leaderKickParty',{id:player.dataset.id});
					
				}]},'[X]'));
				
			}
			
			if( (MM.partyId != App.storage.data.id) && (player.dataset.id == App.storage.data.id) ){
				
				nickname.append(DOM({tag:'span',event:['click', async () => {
					
					await App.api.request('mm','leaveParty',{id:MM.partyId});
					
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
							
							await App.api.request('mm','heroParty',{id:MM.partyId,hero:item.id});
							
							MM.activeSelectHero = item.id;
							
							player.children[1].style.backgroundImage = (item.id) ? `url(hero/${item.id}/1.png)` : `url(hero/empty-ru.avif)`;
							
							Splash.hide();
							
						});
						
						if(item.id){
							
							hero.dataset.url = `hero/${item.id}/1.png`;
							
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
						
						let request = await App.api.request('mm','findUser',{name:input.value});
						
						if(body.firstChild){
							
							while(body.firstChild){
								
								body.firstChild.remove();
								
							}
							
						}
						
						for(let item of request){
							
							body.append(DOM({event:['click', async () => {
								
								await App.api.request('mm','inviteParty',{id:item.id});
								
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
		
		body.append(DOM({style:'main-header'},
		DOM({tag:'img',src:'logo.png',event:['click',() => View.show('adm')]}),
		play,
		DOM({style:'main-header-item',event:['click',() => View.show('main')]},App.storage.data.login),
		DOM({style:'main-header-item',event:['click',() => View.show('builds')]},'Билды'),
		DOM({style:'main-header-item',event:['click',() => App.exit()]},'Выйти')
		),
		DOM({style:'main-body-full'},party)
		);
		
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
			
			for(let item of result){
				
				let hero = DOM({style:'hero-item'},DOM({tag:'span'},item.name));
				
				hero.addEventListener('click',() => View.show('build',item.id));
				
				hero.dataset.id = item.id;
				
				hero.dataset.slide = 1;
				
				hero.dataset.total = item.total;
				
				hero.dataset.url = `hero/${item.id}/1.png`;
				
				preload.add(hero);
				
			}
			
		},'build','heroAll');
		
		let play = MM.play();
		
		play.classList.add('main-header-item');
		
		play.classList.add('button-play');
		
		body.append(DOM({style:'main-header'},
		DOM({tag:'img',src:'logo.png',event:['click',() => View.show('adm')]}),
		play,
		DOM({style:'main-header-item',event:['click',() => View.show('main')]},App.storage.data.login),
		DOM({style:'main-header-item',event:['click',() => View.show('inventory')]},'Осколки'),
		DOM({style:'main-header-item',event:['click',() => View.show('game')]},'Фарм'),
		DOM({style:'main-header-item',event:['click',() => App.exit()]},'Выйти')
		),
		DOM({style:'main-body-full'},hero)
		);
		
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
		
		let body = DOM({style:'main-vertical'});
		
		await Build.init(heroId,targetId);
		
		// build-field-top ->    play,DOM({event:['click',() => View.show('main')]},'Закрыть окно билда [X]')
		body.append(
		DOM({style:'build-field-top'},Build.listView),
		DOM({style:'build'},Build.heroView,Build.levelView,Build.fieldView,Build.inventoryView,Build.rarityView),
		DOM({style:'build-field-bottom'},Build.activeBarView)
		);
		
		return body;
		
	}
	
	static async adm(){
		
		let body = DOM({style:'main'}), adm = DOM({style:'adm'});
		
		let result = await App.api.request('build','adm');
		
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
					
					await App.api.request('build','admEdit',{id:item.id,object:object});
					
				},{value:item[key]}));
				
			}
			
			adm.append(div);
			
		}
		
		body.append(DOM({event:['click',() => View.show('userAdm')]},'Аккаунты пользователей'),adm);
		
		return body;
		
	}
	
	static async userAdm(){
		
		let body = DOM({style:'main'}), adm = DOM({style:'adm'});
		
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
		speedtal: 'Скорость',
		srsv: 'Сила/Разум/Стойкость/Воля',
		krajahp: 'Кража здоровья',
		regenhp: 'Регенерация здоровья',
		mp: 'Энергия',
		krajamp: 'Кража энергии',
		stoikostrz: 'Стойкость на родной земле',
		voliarz: 'Воля на родной земле',
		speedtalrz: 'Скорость на родной земле',
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
		vs: 'Воля/Стойкость'
	};
	
	static async init(heroId,targetId){
		
		Build.talents = new Object();
		
		Build.descriptionView = document.createElement('div');
		
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
		
		Build.inventoryView = document.createElement('div');
		
		Build.inventoryView.classList.add('build-talent');
		
		Build.rarityView = document.createElement('div');
		
		Build.rarityView.classList.add('build-rarity');
		
		Build.activeBarView = document.createElement('div');
		
		Build.activeBarView.classList.add('build-active-bar');
		
		let request = await App.api.request('build','data',{heroId:heroId,target:targetId});
		console.log('request',request);
		Build.id = request.id;
		
		Build.heroId = heroId;
		
		Build.dataStats = new Object();
		
		Build.list(request.build);
		
		Build.hero(request.hero);
		
		Build.level();
		
		Build.field(request.body);
		
		Build.inventory();
		
		Build.rarity();
		
		Build.activeBar(request.active);
		
		Build.ruleSortInventory = new Object();
		
	}
	
	static list(builds){
		
		for(let build of builds){
			
			let item = DOM({tag: 'button', style: ['build-list-item', 'btn-hover', 'color-2']}, `${build.name}`);
			
			item.onclick = () => {
				
				View.show('build',Build.heroId,build.id);
				
			}
			
			Build.listView.append(item);
			
		}
		
		if(builds.length < 6){
			
			let create = DOM({tag: 'button', style: ['build-list-item', 'new-build', 'btn-hover', 'color-1'] ,event:['click', () => {
				
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
				
				template.append(name,button);
				
				Splash.show(template);
				
			}]},`Новый билд`);
			
			Build.listView.append(create);
			
		}
		
		Build.listView.append(DOM({tag: 'button', style: ['build-list-item', 'btn-hover', 'color-1'], event:['click', async () => {
			
			await App.api.request('build','random',{id:Build.id});
			
			View.show('build',Build.heroId);
			
		}]},'Случайный билд'));
		Build.listView.append(DOM({style:'build-list-close',event:['click',() => View.show('main')]},'[X]'));
		
		
		
	}
	
	static hero(data){
		
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
			volia:'Воля'
			
		};
		
		for(let key in template){
			
			let item = DOM({style:'build-hero-stats-item',event:['click',() => {
				console.log('Build.talents',Build.talents);
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
					
				}
				else{
					
					item.classList
					
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
						
					}
					else{
						
						Build.setSortInventory('stats',key);
						
					}
					// Build.setSortInventory('stats','hp');
					
					Build.sortInventory();
					
					item.dataset.active = 1;
					
				}
				
			}]},DOM({tag:'div'},template[key]),DOM({tag:'div'},data.stats[key]));
			
			item.dataset.active = 0;
			
			Build.dataStats[key] = item;
			
			stats.append(item);
			
		}
		
		Build.heroImg = DOM({tag:'img',src:`hero/${data.id}/1.png`});
		
		Build.heroView.append(Build.heroImg,stats);
		
	}
	
	static setStat(talent,fold = true,animation = true){
		
		if( !('stats' in talent) ){
			
			return;
			
		}
		
		for(let key in talent.stats){
			
			let add = new Object();
			
			if(key == 'sr'){
				
				let p1 = parseFloat(Build.dataStats['sila'].lastChild.innerText);
				
				let p2 = parseFloat(Build.dataStats['razum'].lastChild.innerText);
				
				if(p1 > p2){
					
					add['sila'] =  talent.stats[key];
					
				}
				else{
					
					add['razum'] =  talent.stats[key];
					
				}
				
			}
			else if(key == 'ph'){
				
				let p1 = parseFloat(Build.dataStats['provorstvo'].lastChild.innerText);
				
				let p2 = parseFloat(Build.dataStats['hitrost'].lastChild.innerText);
				
				if(p1 > p2){
					
					add['provorstvo'] =  talent.stats[key];
					
				}
				else{
					
					add['hitrost'] =  talent.stats[key];
					
				}
				
			}
			else if(key == 'sv'){
				
				let p1 = parseFloat(Build.dataStats['stoikost'].lastChild.innerText);
				
				let p2 = parseFloat(Build.dataStats['volia'].lastChild.innerText);
				
				if(p1 > p2){
					
					add['stoikost'] =  talent.stats[key];
					
				}
				else{
					
					add['volia'] =  talent.stats[key];
					
				}
				
			}
			else{
				
				add[key] = talent.stats[key];
				
			}
			
			for(let key2 in add){
				
				if( !(key2 in Build.dataStats) ){
					
					continue;
					
				}
				
				let number = parseFloat(Build.dataStats[key2].lastChild.innerText);
				
				if(fold){
					
					Build.dataStats[key2].lastChild.innerText = Math.round(number + parseFloat(add[key2]));
					
				}
				else{
					
					Build.dataStats[key2].lastChild.innerText = Math.round(number - add[key2]);
					
				}
				
				if(animation){
					
					Build.dataStats[key2].animate({transform:['scale(1)','scale(1.5)','scale(1)']},{duration:250,fill:'both',easing:'ease-out'});
					
					Build.heroImg.animate({transform:['scale(1)','scale(1.5)','scale(1)']},{duration:250,fill:'both',easing:'ease-out'});
					
				}
				
			}
			
		}
		
	}
	
	static level(){
		
		let level = ['VI','V','IV','III','II','I'], i = 6;
		
		for(let number of level){
			
			let item = document.createElement('div');
			
			item.innerText = number
			
			item.dataset.id = i;
			
			item.dataset.active = 0;
			
			item.id = `bl${i}`
			
			item.addEventListener('click',() => {
				
				if(item.dataset.active == 1){
					
					item.style.background = 'rgba(255,255,255,0.2)';
					
					Build.removeSortInventory('level',item.dataset.id);
					
					Build.sortInventory();
					
					item.dataset.active = 0;
					
				}
				else{
					
					item.style.background = 'rgba(153,255,51,0.7)';
					
					Build.setSortInventory('level',item.dataset.id);
					
					Build.sortInventory();
					
					item.dataset.active = 1;
					
				}
				
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
					
					Build.setStat(data[index],true,false);
					
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
				
				x++;
				
				index++;
				
			}
			
			Build.fieldView.append(row);
			
			level--;
			
			y++;
		}
		
	}
	
	static templateViewTalent(data){
		
		let talent = document.createElement('div');
		
		talent.classList.add('build-talent-item');
		
		Build.talents[data.id] = data;
		
		talent.dataset.id = data.id;
		
		talent.dataset.state = data.state;
		
		talent.dataset.url = (data.id > 0) ? `talents/${data.id}.png` : `htalents/${Math.abs(data.id)}.png`;
		
		Build.move(talent);
		
		Build.description(talent);
		
		return talent;
		
		preload.add(talent);
		
	}
	
	static inventory(){
		
		let preload = new PreloadImages(Build.inventoryView);
		
		App.api.silent((data) => {
			
			for(let item of data){
				
				item.state = 1;
				
				preload.add(Build.templateViewTalent(item));
				
			}
			
		},'build','inventory',{buildId:Build.id});
		
	}
	
	static rarity(){
		
		let element = [{id:'4',color:'170,20,44'},{id:'3',color:'237,129,5'},{id:'2',color:'205,0,205'},{id:'1',color:'17,105,237'}];
		
		let a = document.createElement('div');
		
		a.classList.add('build-rarity-other');
		
		a.innerText = 'A';
		
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
			
			Build.rarityView.append(button);
			
		}
		
		
	}
	
	static activeBar(data){
		console.log('activeBar',data)
		let index = 0;
		
		for(let item of data){
			
			let element = DOM({data:{index:index},style:'build-active-bar-item',event:['click', async () => {
				
				if(element.dataset.active == 1){
					
					element.style.background = 'rgba(255,255,255,0.2)';
					
					element.dataset.active = 0;
					
				}
				else{
					
					element.style.background = 'rgba(153,255,51,0.7)';
					
					element.dataset.active = 1;
					
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
				
				element.style.background = 'rgba(153,255,51,0.7)';
				
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
		
		for(let item of Build.inventoryView.children){
			
			let data = Build.talents[item.dataset.id], flag = true;
			
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
			
			Build.descriptionView.style.display = 'none';
			
			let data = Build.talents[element.dataset.id];
			
			let fieldRow = document.getElementById(`bfr${data.level}`);
			
			fieldRow.style.background = 'rgba(255,255,255,0.5)';
			
			fieldRow.style.borderRadius = '15px';
			
			let shiftX = event.pageX - element.getBoundingClientRect().left;
			
			let shiftY = event.pageY - element.getBoundingClientRect().top;
			
			element.style.zIndex = 9999;
			
			element.style.position = 'absolute';
			
			element.style.left = event.pageX - shiftX + 'px';
			
			element.style.top = event.pageY - shiftY + 'px';
			
			document.onmousemove = (e) => {
				
				element.style.left = e.pageX - shiftX + 'px';
				
				element.style.top = e.pageY - shiftY + 'px';
				
			}
			
			element.onmouseup = async (event) => {
				
				document.onmousemove = null;
				
				element.onmouseup = null;
				
				let field = Build.fieldView.getBoundingClientRect();
				
				let inventory = Build.inventoryView.getBoundingClientRect();
				
				let bar = Build.activeBarView.getBoundingClientRect();
				
				let target = element.getBoundingClientRect();
				
				let left = parseInt(element.style.left) + (target.width / 2);
				
				let top = parseInt(element.style.top) + (target.height / 2);
				
				if( (left > field.x) && (left < (field.x + field.width) ) && (top > field.y) && (top < (field.y + field.height) ) ){
					
					element.style.display = 'none';
					
					let elemBelow = document.elementFromPoint(event.clientX, event.clientY);
					
					element.style.display = 'block';
					
					if(elemBelow && (elemBelow.className == 'build-field-item') ){
						
						if( (data.level) && (elemBelow.parentNode.dataset.level == data.level) ){
							
							if(data.id > 0){
								
								element.dataset.state = 2;
								
								elemBelow.append(element);
								
								Build.setStat(data,true);
								
								try{
									
									await App.api.request('build','set',{buildId:Build.id,talentId:data.id,index:elemBelow.dataset.position});
									
								}catch(e){
									
									element.dataset.state = 1;
									
									Build.inventoryView.prepend(element);
									
									Build.setStat(data,false);
									
								}
								
							}
							else{
								
								let conflictState = false;
								
								for(let item of data.conflict){
									
									if(item in Build.fieldConflict){
										
										conflictState = true;
										
									}
									
								}
								
								if(!conflictState){
									
									Build.fieldConflict[Math.abs(data.id)] = true;
									
									element.dataset.state = 2;
									
									elemBelow.append(element);
									
									Build.setStat(data,true);
									
									try{
										
										await App.api.request('build','set',{buildId:Build.id,talentId:data.id,index:elemBelow.dataset.position});
										
									}catch(e){
										
										element.dataset.state = 1;
										
										Build.inventoryView.prepend(element);
										
										Build.setStat(data,false);
										
									}
									
								}
								
							}
							
							
							
						}
						
					}
					
				}
				else if( (left > inventory.x) && (left < (inventory.x + inventory.width) ) && (top > inventory.y) && (top < (inventory.y + inventory.height) ) ){
					
					element.style.display = 'none';
					
					let elemBelow = document.elementFromPoint(event.clientX, event.clientY);
					
					element.style.display = 'block';
					
					if(elemBelow && (elemBelow.parentNode.className == 'build-talent') && (element.dataset.state != 1) ){
						
						let oldParentNode = element.parentNode;
						
						element.dataset.state = 1;
						
						elemBelow.parentNode.prepend(element);
						
						Build.setStat(data,false);
						
						try{
							
							await App.api.request('build','setZero',{buildId:Build.id,index:oldParentNode.dataset.position});
							
							if(data.id < 0){
								
								delete Build.fieldConflict[Math.abs(data.id)];
								
							}
							
						}
						catch(e){
							
							element.dataset.state = 2;
							
							oldParentNode.append(element);
							
							Build.setStat(data,true);
							
						}
						
					}
					
				}
				else if( (left > bar.x) && (left < (bar.x + bar.width) ) && (top > bar.y) && (top < (bar.y + bar.height) ) ){
					
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
							
							let clone = element.cloneNode(true);
							
							clone.dataset.position = element.parentNode.dataset.position;
							
							clone.oncontextmenu = () => {
								
								try{
									
									App.api.request('build','setZeroActive',{buildId:Build.id,index:index});
									
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
				
				fieldRow.style.background = 'none';
				
				element.style.position = 'static';
				
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
						
						stats += `+${data.stats[key]} ${(Build.language[key]) ? Build.language[key] : key}<br>`;
						
					}
					
				}
				
				Build.descriptionView.innerHTML = `<b style="color:rgb(${rgb})">${data.name}</b><div>${data.description}</div><span>${stats}</span>`;
				
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
	
	static stat(data){
		
		console.log('stat',data);
		
		let find = document.getElementById('STAT');
		
		if(find){
			
			find.innerText = `Онлайн: ${data.online}, Матчмейкинг (очередь): ${data.player}, Группы: ${data.party}`
			
		}
		
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
	
	static MMFinish(data){
		
		MM.finish(data);
		
	}
	
	static PInvite(data){
		
		let body = document.createDocumentFragment();
		
		let b1 = DOM({style:'splash-content-button',event:['click', async () => {
			
			await App.api.request('mm','joinParty',{code:data.code});
			
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
			
			find.children[1].style.backgroundImage = (data.hero) ? `url(hero/${data.hero}/1.png)` : `url(hero/empty-ru.avif)`;
			
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
	
}

class App {
	
	static async init(){
		
		document.body.append(DOM({id:'STAT'}));
		
		Splash.init();
		
		// ws://192.168.31.194:3737
		App.api = new Api('wss://playpw.fun:443/api/v1/',Events); // wss://playpw.fun:443/api/v1/
		// ws://192.168.9.167:7373
		await Store.init();
		
		App.storage = new Store('u1');
		
		await App.storage.init({id:0,token:'',login:''});
		
		await Protect.init();
		
		await MM.init();
		
		if(App.storage.data.login){
			
			await App.api.init();
			
			View.show('main');
			
		}
		else{
			
			App.api.init();
			
			View.show('authorization');
			
		}
		
		// App.backgroundAnimate = document.body.animate({backgroundSize:['150%','100%','150%']},{duration:30000,iterations:Infinity,easing:'ease-out'});
		
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
	
}

class Protect {
	
	static async init(){
		
		Protect.storage = new Store('p');
		
		await Protect.storage.init({c:'',v:PW_VERSION,s:false});
		
	}
	
	static async checkInstall(){
		
		if(!Protect.storage.data.s){
			
			if(Protect.storage.data.c){
				
				let request = await App.api.request('mm','check',{id:Protect.storage.data.c});
				
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
				
				await App.api.request('mm','check',{id:c});
				
			}
			
			let launch = DOM({tag:'a',href:`pwclassic://${App.storage.data.token}/checkInstall/${PW_VERSION}/1/1/1`});
			
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
		
		//setTimeout(() => MM.ready(),5000);
		
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
		
		if(!await Protect.checkInstall()){
			
			MM.button.innerText = 'Проверка';
			
			setTimeout(() => {
				
				MM.button.innerText = 'В бой!';
				
			},5000);
			
			return;
			
		}
		
		if(!MM.hero){
			
			MM.hero = await App.api.request('build','heroAll');
			
		}
		
		if(MM.active){
			
			try{
				
				MM.id = await App.api.request('mm','cancel');
				
			}
			catch(error){
				
				return App.error(error);
				
			}
			
			MM.searchActive(false);
			
		}
		else{
			
			try{
				
				let request = await App.api.request('mm','start',{hero:MM.activeSelectHero});
				
				MM.id = request.id;
				
				if(request.type == 'reconnect'){
					
					let reconnect = DOM({tag:'a',href:`pwclassic://${App.storage.data.token}/reconnect/${PW_VERSION}/${request.id}/1/1`});
					
					reconnect.click();
					
					return;
					
				}
				
			}
			catch(error){
				
				return App.error(error);
				
			}
			
			MM.searchActive(true);
			
		}
		
		// setTimeout(() => MM.ready(),5000);
		
	}
	
	static async cancel(){
		
		await App.api.request('mm','start');
		
		MM.id = '';
		
	}
	/*
	static timer(callback,name,seconds){
		
		seconds++;
		
		let sb = DOM(`${name} 00:${seconds}`);
		
		let body = DOM({style:'mm-timer'},sb);
		
		body.animate({opacity:[1,0.5,1]},{duration:1000,iterations:Infinity,easing:'ease-out'});
		
		let start = () => {
			
			seconds--;
			
			sb.innerText = `${name} 00:${(seconds < 10 ? '0': '')}${seconds}`;
			
			if(!seconds){
				
				clearInterval(MM.intervalId);
				
				MM.intervalId = false;
				
				callback();
				
			}
			
		}
		
		MM.intervalId = setInterval(() => start(),1000);
		
		start();
		
		return body;
		
	}
	*/
	static async ready(data){
		
		MM.soundEvent();
		
		MM.id = data.id;
		
		let body = DOM({style:'mm-ready'},Timer.body,DOM({id:`MMReady`,style:'mm-ready-count'},`0/10`));
		
		Timer.start(() => {
			
			MM.close();
			
		},'Бой найден',30);
		
		let button = DOM({style:'mm-ready-button',event:['click', async () => {
			
			await App.api.request('mm','ready',{id:MM.id});
			
			button.style.opacity = 0;
			
		}]},'Готов!');
		
		body.append(button);
		
		MM.show(body);
		
	}
	
	static async lobby(data){
		console.log('MM.LOBBY DATA',data);
		if(!MM.hero){
			
			MM.hero = await App.api.request('build','heroAll');
			
		}
		
		if(!MM.id){
			
			MM.id = data.id;
			
		}
		
		MM.lobbyUsers = data.users;
		
		MM.targetHeroId = data.users[App.storage.data.id].hero;
		
		let leftTeam = DOM({style:'mm-lobby-header-team'});
		
		let rightTeam = DOM({style:'mm-lobby-header-team'});
		
		for(let key of data.map){
			
			let player = DOM({id:`PLAYER${key}`,style:'mm-lobby-header-team-player'});
			
			let hero = DOM({tag:'img'});
			
			if(data.users[key].hero){
				
				hero.src = `hero/${data.users[key].hero}/1.png`;
				
			}
			else{
				
				hero.src = `hero/empty-ru.avif`;
				
			}
			
			let name = DOM({tag:'div'},`${data.users[key].nickname}`);
			
			player.append(hero,name);
			
			if(key == data.target){
				
				MM.targetPlayerAnimate = player.animate({transform:['scale(1)','scale(0.9)','scale(1)']},{duration:500,iterations:Infinity,easing:'ease-out'});
				
			}
			
			if(data.users[App.storage.data.id].team == data.users[key].team){
				
				leftTeam.append(player);
				
			}
			else{
				
				rightTeam.append(player);
				
				name.innerText = 'Инкогнито';
				
			}
			
		}
		
		MM.lobbyHeroes = DOM({style:'mm-lobby-middle-hero'});
		
		let preload = new PreloadImages(MM.lobbyHeroes);
		
		for(let item of MM.hero){
			
			let hero = DOM({id:`HERO${item.id}`,data:{active:0}});
			
			hero.dataset.url = `hero/${item.id}/1.png`;
			
			hero.onclick = () => {
				
				MM.targetHeroId = item.id;
				
				App.api.request('mm','eventChangeHero',{id:MM.id,heroId:item.id});
				
			}
			
			preload.add(hero);
			
		}
		
		let info = DOM({style:'lobby-info'});
		
		MM.selectHeroButton = DOM({style:'lobby-select-hero'},'Выбрать!');
		
		MM.selectHeroButton.addEventListener('click', async () => {
			
			await App.api.request('mm','hero',{id:MM.id,heroId:MM.targetHeroId});
			
		});
		
		if(App.storage.data.id != data.target){
			
			MM.selectHeroButton.style.opacity = 0;
			
		}
		
		Timer.start(() => {
			
			MM.close();
			
		},'',30);
		
		Timer.body.style.fontSize = '3.5vh';
		
		Timer.body.style.fontWeight = 600;
		
		info.append(Timer.body,MM.selectHeroButton);
		
		MM.chatBody = DOM({style:'mm-lobby-middle-chat-body'});
		
		let chatInput = DOM({tag:'input',style:'mm-lobby-middle-chat-button',placeholder:'Введите сообщение и <Enter>'})
		
		chatInput.addEventListener('keyup', async (event) => {
			
			if(event.code === 'Enter'){
				
				if(chatInput.value.length < 2){
					
					throw 'Количество символов < 2';
					
				}
				
				if(chatInput.value.length > 256){
					
					throw 'Количество символов > 256';
					
				}
				
				await App.api.request('mm','chat',{id:MM.id,message:chatInput.value});
				
				chatInput.value = '';
				
			}
			
		});
		
		let body = DOM({style:'mm-lobby'},DOM({style:'mm-lobby-header'},leftTeam,info,rightTeam),DOM({style:'mm-lobby-middle'},DOM({style:'mm-lobby-middle-chat'},MM.chatBody,chatInput),MM.lobbyHeroes));
		
		MM.show(body);
		
		for(let key in data.users){
			
			if(!data.users[key].hero){
				
				continue;
				
			}
			
			let findHero = document.getElementById(`HERO${data.users[key].hero}`);
			
			if(findHero){
				
				findHero.style.backgroundColor = 'rgba(51, 255, 51, 0.8)';
				
				findHero.dataset.active = 1;
				
			}
			
		}
		
	}
	
	static select(data){
		
		Timer.start(() => {
			
			MM.close();
			
		},'',30);
		
		if(MM.intervalId){
			
			clearInterval(MM.intervalId);
			
		}
		
		if(MM.targetPlayerAnimate){
			
			MM.targetPlayerAnimate.cancel();
			
			MM.targetPlayerAnimate = false;
			
		}
		
		let findOldPlayer = document.getElementById(`PLAYER${data.id}`);
		
		if(findOldPlayer){
			
			findOldPlayer.firstChild.src = `hero/${data.heroId}/1.png`;
			
		}
		
		let findPlayer = document.getElementById(`PLAYER${data.target}`);
		
		if(findPlayer){
			
			MM.targetPlayerAnimate = findPlayer.animate({transform:['scale(1)','scale(0.9)','scale(1)']},{duration:500,iterations:Infinity,easing:'ease-out'});
			
		}
		
		let findHero = document.getElementById(`HERO${data.heroId}`);
		
		if(findHero){
			
			findHero.style.backgroundColor = 'rgba(255,50,0,0.9)';
			
			findHero.onclick = false;
			
		}
		
		if(App.storage.data.id == data.target){
			
			MM.soundEvent();
			
			MM.selectHeroButton.style.opacity = 1;
			
		}
		else{
			
			MM.selectHeroButton.style.opacity = 0;
			
		}
		
	}
	
	static finish(data){
		
		Timer.stop();
		
		MM.close();
		
		let play = DOM({tag:'a',href:`pwclassic://${App.storage.data.token}/runGame/${PW_VERSION}/${data.id}/${data.users[App.storage.data.id].hero}/${Number(data.users[App.storage.data.id].team) - 1}`});
		
		play.click();
		
		View.show('main');
		
	}
	
	static eventChangeHero(data){
		
		let findPlayer = document.getElementById(`PLAYER${data.id}`);
		
		if(findPlayer){
			
			findPlayer.firstChild.src = `hero/${data.heroId}/1.png`;
			
		}
		
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

class Timer {
	
	static intervalId = false;
	
	static seconds = 0;
	
	static init(){
		
		Timer.sb = DOM(`${name} 00:${Timer.seconds}`);
		
		Timer.body = DOM({style:'mm-timer'},Timer.sb);
		
	}
	
	static start(callback,name,seconds){
		
		Timer.callback = callback;
		
		Timer.message = name;
		
		Timer.seconds = (seconds + 1);
		
		if(Timer.intervalId){
			
			clearInterval(Timer.intervalId);
			
			Timer.intervalId = false;
			
		}
		
		Timer.intervalId = setInterval(() => Timer.second(),1000);
		
		Timer.second();
		
	}
	
	static second(){
		
		Timer.seconds--;
		
		Timer.sb.innerText = `${Timer.message} 00:${(Timer.seconds < 10 ? '0': '')}${Timer.seconds}`;
		
		if(!Timer.seconds){
			
			clearInterval(Timer.intervalId);
			
			Timer.intervalId = false;
			
			Timer.callback();
			
		}
		
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

