import { URL_SOUND_LIST_CONVERSATION } from './../../../chat21-core/utils/constants';
import { IonConversationDetailComponent } from '../../chatlib/conversation-detail/ion-conversation-detail/ion-conversation-detail.component';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Directive, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import {
  ModalController,
  PopoverController,
  Platform, ActionSheetController, NavController, IonContent, IonTextarea
} from '@ionic/angular';


// translate
import { TranslateService } from '@ngx-translate/core';

// models
import { UserModel } from 'src/chat21-core/models/user';
import { MessageModel } from 'src/chat21-core/models/message';
import { ConversationModel } from 'src/chat21-core/models/conversation';
import { GroupModel } from 'src/chat21-core/models/group';

// services
import { ChatManager } from 'src/chat21-core/providers/chat-manager';
import { AppConfigProvider } from '../../services/app-config';
import { DatabaseProvider } from '../../services/database';
import { CustomTranslateService } from 'src/chat21-core/providers/custom-translate.service';
import { TypingService } from 'src/chat21-core/providers/abstract/typing.service';
import { ConversationHandlerBuilderService } from 'src/chat21-core/providers/abstract/conversation-handler-builder.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { GroupsHandlerService } from 'src/chat21-core/providers/abstract/groups-handler.service';
import { TiledeskAuthService } from 'src/chat21-core/providers/tiledesk/tiledesk-auth.service';
// import { ChatConversationsHandler } from '../../services/chat-conversations-handler';
import { ConversationsHandlerService } from 'src/chat21-core/providers/abstract/conversations-handler.service';
import { ArchivedConversationsHandlerService } from 'src/chat21-core/providers/abstract/archivedconversations-handler.service';
import { ConversationHandlerService } from 'src/chat21-core/providers/abstract/conversation-handler.service';
// import { CurrentUserService } from 'src/app/services/current-user/current-user.service';
import { ContactsService } from 'src/app/services/contacts/contacts.service';
import { CannedResponsesService } from '../../services/canned-responses/canned-responses.service';
import { compareValues, htmlEntities, replaceEndOfLine } from '../../../chat21-core/utils/utils';
import { ImageRepoService } from 'src/chat21-core/providers/abstract/image-repo.service';
import { PresenceService } from 'src/chat21-core/providers/abstract/presence.service';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
// import { CannedResponsesServiceProvider } from '../../services/canned-responses-service';
// import { GroupService } from '../../services/group';

// pages
// import { _DetailPage } from '../_DetailPage';
// import { ProfilePage } from '../profile/profile';
// import { PopoverPage } from '../popover/popover';

// utils
import {
  SYSTEM, TYPE_SUPPORT_GROUP, TYPE_POPUP_DETAIL_MESSAGE, TYPE_DIRECT, MAX_WIDTH_IMAGES, TYPE_MSG_TEXT, TYPE_MSG_IMAGE, MIN_HEIGHT_TEXTAREA, MSG_STATUS_SENDING,
  MSG_STATUS_SENT, MSG_STATUS_RETURN_RECEIPT, TYPE_GROUP, MESSAGE_TYPE_INFO, MESSAGE_TYPE_MINE, MESSAGE_TYPE_OTHERS, MESSAGE_TYPE_DATE, AUTH_STATE_OFFLINE
} from '../../../chat21-core/utils/constants';

import {
  isInArray,
  isPopupUrl,
  popupUrl,
  stripTags,
  urlify,
  convertMessageAndUrlify,
  checkPlatformIsMobile,
  checkWindowWithIsLessThan991px,
  closeModal,
  setConversationAvatar,
  setChannelType
} from '../../../chat21-core/utils/utils';

import { getColorBck, avatarPlaceholder } from '../../../chat21-core/utils/utils-user';

import {
  isFirstMessage,
  isImage,
  isFile,
  isInfo,
  isMine,
  messageType
} from 'src/chat21-core/utils/utils-message';

// import { EventsService } from '../../services/events-service';
// import { initializeApp } from 'firebase';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { NgxLinkifyjsService, Link, LinkType, NgxLinkifyOptions } from 'ngx-linkifyjs';

@Component({
  selector: 'app-conversation-detail',
  templateUrl: './conversation-detail.page.html',
  styleUrls: ['./conversation-detail.page.scss'],
})



export class ConversationDetailPage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('ionContentChatArea', { static: false }) ionContentChatArea: IonContent;
  @ViewChild('rowMessageTextArea', { static: false }) rowTextArea: ElementRef;

  showButtonToBottom = false; // indica lo stato del pulsante per scrollare la chat (showed/hidden)
  NUM_BADGES = 0; // numero di messaggi non letti
  COLOR_GREEN = '#24d066'; // colore presence active da spostare nelle costanti
  COLOR_RED = '#db4437'; // colore presence none da spostare nelle costanti

  private subscriptions: Array<any>;
  public tenant: string;
  public loggedUser: UserModel;
  public conversationWith: string;
  public conversationWithFullname: string;
  public messages: Array<MessageModel> = [];
  private conversationSelected: any;
  public groupDetail: GroupModel;
  // public attributes: any;
  public messageSelected: any;
  public channelType: string;
  public online: boolean;
  public lastConnectionDate: string;
  public showMessageWelcome: boolean;
  public openInfoConversation = false;
  public openInfoMessage: boolean;              /** check is open info message */
  public isMobile = false;
  public isLessThan991px = false; // nk added
  public isTyping = false;
  public nameUserTypingNow: string;

  public heightMessageTextArea = '';
  public translationMap: Map<string, string>;
  public conversationAvatar: any;
  public membersConversation: any;
  public member: UserModel;
  public urlConversationSupportGroup: any;

  private isFileSelected: boolean;
  private timeScrollBottom: any;
  public showIonContent = false;
  public conv_type: string;

  public tagsCanned: any = [];
  public tagsCannedFilter: any = [];

  public window: any = window;
  public styleMap: Map<string, string> = new Map();
  // eventsReplaceTexareaText: Subject<void> = new Subject<void>();

  MESSAGE_TYPE_INFO = MESSAGE_TYPE_INFO;
  MESSAGE_TYPE_MINE = MESSAGE_TYPE_MINE;
  MESSAGE_TYPE_OTHERS = MESSAGE_TYPE_OTHERS;

  // arrowkeyLocation: number;
  arrowkeyLocation = -1;

  //SOUND
  setTimeoutSound: any;
  audio: any
  isOpenInfoConversation: boolean;
  USER_HAS_OPENED_CLOSE_INFO_CONV: boolean = false
  isHovering: boolean = false;

  dropEvent:any
  isMine = isMine;
  isInfo = isInfo;
  isFirstMessage = isFirstMessage;
  messageType = messageType;


  private linkifyOptions: NgxLinkifyOptions = {
    className: 'linkify',
    target: {
      url: '_blank'
    }
  };
  private unsubscribe$: Subject<any> = new Subject<any>();
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public chatManager: ChatManager,
    public actionSheetCtrl: ActionSheetController,
    public platform: Platform,
    // private upSvc: UploadService,
    private translateService: TranslateService,
    private customTranslateService: CustomTranslateService,
    public appConfigProvider: AppConfigProvider,
    private databaseProvider: DatabaseProvider,
    private keyboard: Keyboard,
    public modalController: ModalController,
    public typingService: TypingService,
    private sanitizer: DomSanitizer,
    // public authService: AuthService,
    public tiledeskAuthService: TiledeskAuthService,
    // public chatConversationsHandler: ChatConversationsHandler,
    public conversationsHandlerService: ConversationsHandlerService,
    public archivedConversationsHandlerService: ArchivedConversationsHandlerService,
    public conversationHandlerService: ConversationHandlerService,
    // public currentUserService: CurrentUserService,
    // public cannedResponsesServiceProvider: CannedResponsesServiceProvider,
    public groupService: GroupsHandlerService,
    public contactsService: ContactsService,
    public conversationHandlerBuilderService: ConversationHandlerBuilderService,
    public linkifyService: NgxLinkifyjsService,
    private logger: LoggerService,
    public cannedResponsesService: CannedResponsesService,
    public imageRepoService: ImageRepoService,
    public presenceService: PresenceService,

  ) {


  }

  // -------------- SYSTEM FUNCTIONS -------------- //


  /** */
  // con il routing la gestione delle pagine è automatica (da indagare),
  // non sempre passa da ngOnInit/ngOnDestroy! Evitare di aggiungere logica qui
  //
  ngOnInit() {
    console.log('ngOnInit ConversationDetailPage window.location: ', window.location);
  }

  ngAfterViewInit() {
    // console.log('ngAfterViewInit ConversationDetailPage: ');
  }

  ngOnDestroy() {
  }


  ionViewWillEnter() {
    this.loggedUser = this.tiledeskAuthService.getCurrentUser();
    console.log('ConversationDetailPage ionViewWillEnter loggedUser: ', this.loggedUser);
    this.listnerStart();
  }


  ionViewDidEnter() {
  }

  /**
   * quando esco dalla pagina distruggo i subscribe
   * e chiudo la finestra di info
   */
  ionViewWillLeave() {
    // console.log('ionViewWillLeave ConversationDetailPage: ');
    this.unsubescribeAll();
  }

  private listnerStart() {
    const that = this;
    this.chatManager.BSStart.subscribe((data: any) => {
      console.log('***** BSStart ConversationDetailPage *****', data);
      if (data) {
        that.initialize();
      }
    });
  }

  // -------------- START MY functions -------------- //
  /** */
  initialize() {
    this.loggedUser = this.tiledeskAuthService.getCurrentUser();
    console.log('ConversationDetailPage initialize loggedUser: ', this.loggedUser);
    this.translations();
    // this.conversationSelected = localStorage.getItem('conversationSelected');
    this.showButtonToBottom = false;
    this.showMessageWelcome = false;
    // this.tenant = environment.tenant;

    const appconfig = this.appConfigProvider.getConfig()
    this.tenant = appconfig.tenant;
    console.log('ConversationDetailPage tenant ', this.tenant);


    // Change list on date change
    this.route.paramMap.subscribe(params => {
      console.log('ConversationDetailPage initialize params: ', params);
      this.conversationWith = params.get('IDConv');
      this.conversationWithFullname = params.get('FullNameConv');
      this.conv_type = params.get('Convtype');
    });

    console.log('ConversationDetailPage initialize - conversationWith: ', this.conversationWith, ' conversationWithFullname: ', this.conversationWithFullname);
    this.subscriptions = [];
    this.setHeightTextArea();
    this.tagsCanned = []; // list of canned
    this.messages = []; // list messages of conversation
    this.isFileSelected = false; // indica se è stato selezionato un file (image da uplodare)
    this.openInfoMessage = false; // indica se è aperto il box info message

    if (checkPlatformIsMobile()) {
      this.isMobile = true;
      // this.openInfoConversation = false; // indica se è aperto il box info conversazione
      console.log('CONV-DETAIL-PAGE')
    } else {
      this.isMobile = false;
      // this.openInfoConversation = true;
    }


    if (checkWindowWithIsLessThan991px()) {
      console.log('CONV-DETAIL-PAGE checkWindowWithIsLessThan991px ', checkWindowWithIsLessThan991px())
      this.openInfoConversation = false; // indica se è aperto il box info conversazione
      this.isOpenInfoConversation = false;
      console.log('CONV-DETAIL-PAGE')
    } else {
      console.log('CONV-DETAIL-PAGE checkWindowWithIsLessThan991px ', checkWindowWithIsLessThan991px())
      this.openInfoConversation = true;
      this.isOpenInfoConversation = true;
    }




    this.online = false;
    this.lastConnectionDate = '';

    // init handler vengono prima delle sottoscrizioni!
    // this.initConversationsHandler(); // nk
    if (this.conversationWith) {
      this.initConversationHandler();
      this.initGroupsHandler();
      this.initSubscriptions();
    }
    this.addEventsKeyboard();
    this.startConversation();
    this.updateConversationBadge(); // AGGIORNO STATO DELLA CONVERSAZIONE A 'LETTA' (is_new = false)
  }

  returnOpenCloseInfoConversation(openInfoConversation: boolean) {
    console.log('CONVERSATION-DETAIL returnOpenCloseInfoConversation **************', openInfoConversation);
    this.resizeTextArea();
    this.openInfoMessage = false;
    this.openInfoConversation = openInfoConversation;
    this.isOpenInfoConversation = openInfoConversation
    this.USER_HAS_OPENED_CLOSE_INFO_CONV = true;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // this.newInnerWidth = event.target.innerWidth;
    const newInnerWidth = event.target.innerWidth;
    // console.log('CONV-DETAIL-PAGE checkWindowWithIsLessThan991px on resize ', newInnerWidth);
    if (newInnerWidth < 991) {
      if (this.USER_HAS_OPENED_CLOSE_INFO_CONV === false) {
        this.openInfoConversation = false;
        this.isOpenInfoConversation = false;
      }
    }

  }



  /**
   * translations
   * translationMap passed to components in the html file
   */
  public translations() {
    const keys = [
      'LABEL_AVAILABLE',
      'LABEL_NOT_AVAILABLE',
      'LABEL_TODAY',
      'LABEL_TOMORROW',
      'LABEL_TO',
      'LABEL_LAST_ACCESS',
      'ARRAY_DAYS',
      'LABEL_ACTIVE_NOW',
      'LABEL_IS_WRITING',
      'LABEL_INFO_ADVANCED',
      'ID_CONVERSATION',
      'UPLOAD_FILE_ERROR',
      'LABEL_ENTER_MSG',
      'LABEL_ENTER_MSG_SHORT',
      'LABEL_ENTER_MSG_SHORTER'
    ];
    this.translationMap = this.customTranslateService.translateLanguage(keys);
  }

  /**
   * setTranslationMapForConversationHandler
   */
  private setTranslationMapForConversationHandler(): Map<string, string> {
    const keys = [
      'INFO_SUPPORT_USER_ADDED_SUBJECT',
      'INFO_SUPPORT_USER_ADDED_YOU_VERB',
      'INFO_SUPPORT_USER_ADDED_COMPLEMENT',
      'INFO_SUPPORT_USER_ADDED_VERB',
      'INFO_SUPPORT_CHAT_REOPENED',
      'INFO_SUPPORT_CHAT_CLOSED',
      'LABEL_TODAY',
      'LABEL_TOMORROW',
      'LABEL_LAST_ACCESS',
      'LABEL_TO',
      'ARRAY_DAYS'
    ];
    return this.customTranslateService.translateLanguage(keys);
  }

  /**
   * recupero da chatManager l'handler
   * se NON ESISTE creo un handler e mi connetto e lo memorizzo nel chatmanager
   * se ESISTE mi connetto
   * carico messaggi
   * attendo x sec se nn arrivano messaggi visualizzo msg wellcome
   */
  initConversationHandler() {
    const translationMap = this.setTranslationMapForConversationHandler();
    this.showMessageWelcome = false;
    const handler: ConversationHandlerService = this.chatManager.getConversationHandlerByConversationId(this.conversationWith);
    console.log('DETTAGLIO CONV - handler **************', handler, this.conversationWith);
    if (!handler) {
      this.conversationHandlerService = this.conversationHandlerBuilderService.build();
      this.conversationHandlerService.initialize(
        this.conversationWith,
        this.conversationWithFullname,
        this.loggedUser,
        this.tenant,
        translationMap
      );
      this.conversationHandlerService.connect();
      console.log('DETTAGLIO CONV - NEW handler **************', this.conversationHandlerService);
      this.messages = this.conversationHandlerService.messages;
      console.log('DETTAGLIO CONV - messages **************', this.messages);
      this.chatManager.addConversationHandler(this.conversationHandlerService);

      // attendo un secondo e poi visualizzo il messaggio se nn ci sono messaggi
      const that = this;
      setTimeout(() => {
        if (!that.messages || that.messages.length === 0) {
          this.showIonContent = true;
          that.showMessageWelcome = true;
          console.log('setTimeout ***', that.showMessageWelcome);
        }
      }, 8000);

    } else {
      console.log('NON ENTRO ***', this.conversationHandlerService, handler);
      this.conversationHandlerService = handler;
      this.messages = this.conversationHandlerService.messages;
      // sicuramente ci sono messaggi
      // la conversazione l'ho già caricata precedentemente
      // mi arriva sempre notifica dell'ultimo msg (tramite BehaviorSubject)
      // scrollo al bottom della pagina
    }
    console.log('CONVERSATION MESSAGES ' + this.messages + this.showIonContent);
  }


  initGroupsHandler() {
    if (this.conversationWith.startsWith("support-group") || this.conversationWith.startsWith("group-")) {
      this.groupService.initialize(this.tenant, this.loggedUser.uid)
      // this.groupService.connect();
    }

  }



  // -------------- END SET INFO COMPONENT -------------- //

  private setAttributes(): any {
    const attributes: any = {
      client: navigator.userAgent,
      sourcePage: location.href,

    };

    //TODO: servono ???
    if (this.loggedUser && this.loggedUser.email) {
      attributes.userEmail = this.loggedUser.email
    }
    if (this.loggedUser && this.loggedUser.fullname) {
      attributes.userFullname = this.loggedUser.fullname
    }

    return attributes;
  }



  // ---------------------------------
  // startConversation
  // ---------------------------------
  startConversation() {
    console.log('startConversation: ', this.conversationWith);
    if (this.conversationWith) {
      this.channelType = setChannelType(this.conversationWith);
      console.log('setChannelType: ', this.channelType);
      // this.selectInfoContentTypeComponent();
      this.setHeaderContent();
    }
  }

  setHeaderContent() {
    this.conversationAvatar = setConversationAvatar(
      this.conversationWith,
      this.conversationWithFullname,
      this.channelType
    );
    console.log('this.conversationAvatar: ', this.conversationAvatar);
  }

  returnSendMessage(e: any) {
    console.log('CONVERSATION-DETAIL returnSendMessage::: ', e, this.conversationWith);
    console.log('CONVERSATION-DETAIL returnSendMessage::: ', e, this.conversationWith);
    console.log('CONVERSATION-DETAIL returnSendMessage::: message', e.message);
    try {
      let message = '';
      if (e.message) {
        message = e.message;
      }
      const type = e.type;
      const metadata = e.metadata;

      this.sendMessage(message, type, metadata);

    } catch (err) {
      console.log('error: ', err);
    }
  }

  /**
   * se il messaggio non è vuoto
   * 1 - ripristino l'altezza del box input a quella di default
   * 2 - invio il messaggio
   * 3 - se l'invio è andato a buon fine mi posiziono sull'ultimo messaggio
   */
  sendMessage(msg: string, type: string, metadata?: any) {
    console.log('CONVERSATION-DETAIL SEND MESSAGE - MSG: ', msg);

    let fullname = this.loggedUser.uid;
    if (this.loggedUser.fullname) {
      fullname = this.loggedUser.fullname;
    }

    // console.log('FIREBASE-UPLOAD CONVERSATION-DETAIL SEND MESSAGE loggedUserID: ', this.loggedUser.uid);
    // console.log('FIREBASE-UPLOAD CONVERSATION-DETAIL SEND MESSAGE conversationWith: ', this.conversationWith);
    // console.log('FIREBASE-UPLOAD CONVERSATION-DETAIL SEND MESSAGE conversationWithFullname: ', this.conversationWithFullname);
    // console.log('FIREBASE-UPLOAD CONVERSATION-DETAIL SEND MESSAGE metadata: ', metadata);
    // console.log('FIREBASE-UPLOAD CONVERSATION-DETAIL SEND MESSAGE type: ', type);

    if (type === 'file') {

      if (msg) {
        // msg = msg + '<br>' + 'File: ' + metadata.src;
        msg = msg + '\n' + `[${metadata.name}](${metadata.src})`

      } else {
        // msg = 'File: ' + metadata.src;
        // msg =  `<a href=${metadata.src} download>
        //   ${metadata.name}
        // </a>`

        // msg = `![file-image-placehoder](./assets/images/file-alt-solid.png)` + `[${metadata.name}](${metadata.src})`
        msg = `[${metadata.name}](${metadata.src})`
      }
    }
    //     <a href="/images/myw3schoolsimage.jpg" download>
    //   <img src="/images/myw3schoolsimage.jpg" alt="W3Schools" width="104" height="142">
    // </a>

    (metadata) ? metadata = metadata : metadata = '';
    console.log('SEND MESSAGE: ', msg, this.messages, this.loggedUser);
    if (msg && msg.trim() !== '' || type !== TYPE_MSG_TEXT) {
      this.conversationHandlerService.sendMessage(
        msg,
        type,
        metadata,
        this.conversationWith,
        this.conversationWithFullname,
        this.loggedUser.uid,
        fullname,
        this.channelType,
        this.setAttributes()
      );
      // this.chatManager.conversationsHandlerService.uidConvSelected = this.conversationWith;
    }
  }

  /** */
  // setWritingMessages(str) {
  //   this.conversationHandler.setWritingMessages(str, this.channelType);
  // }

  // -------------- END MY functions -------------- //


  // -------------- START subscriptionS functions -------------- //
  /**
   * subscriptions list
   */
  initSubscriptions() {
    console.log('||------------> initSubscriptions: ', this.subscriptions);

    const that = this;
    let subscription: any;
    let subscriptionKey: string;

    // subscriptionKey = 'BSConversationDetail';
    // subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    // if (!subscription) {
    //   subscription = this.conversationsHandlerService.BSConversationDetail.subscribe((data: any) => {
    //     console.log('***** DATAIL subscribeConversationDetail *****', data);
    //     if (data) {
    //       that.conversationSelected = data;
    //       that.selectInfoContentTypeComponent();
    //     }
    //   });
    //   const subscribe = { key: subscriptionKey, value: subscription };
    //   this.subscriptions.push(subscribe);
    // }

    // ---------------------------------------------------------------------------------
    // FOR THE ARCHIVED
    // ---------------------------------------------------------------------------------
    // subscriptionKey = 'BSArchivedConversationDetail';
    // subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    // if (!subscription) {
    //   subscription = this.archivedConversationsHandlerService.BSConversationDetail.subscribe((data: any) => {
    //     console.log('***** DATAIL ARCHIVED subscribeConversationDetail *****', data);
    //     if (data) {
    //       that.conversationSelected = data;
    //       that.selectInfoContentTypeComponent();
    //     }
    //   });
    //   const subscribe = { key: subscriptionKey, value: subscription };
    //   this.subscriptions.push(subscribe);
    // }

    subscriptionKey = 'BSConversationsChanged';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      subscription = this.conversationsHandlerService.conversationChanged.subscribe((data: ConversationModel) => {
        console.log('***** DATAIL subscribeConversationChanged*****', data, this.loggedUser.uid);
        if (data && data.sender !== this.loggedUser.uid) {
          // AGGIORNO LA CONVERSAZIONE A 'LETTA' SE SONO IO CHE HA SCRITTO L'ULTIMO MESSAGGIO DELLA CONVERSAZIONE
          // E SE LA POSIZIONE DELLO SCROLL E' ALLA FINE
          if (!this.showButtonToBottom && data.is_new) { //SONO ALLA FINE
            this.updateConversationBadge()
          }
        }
      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }


    // subscriptionKey = 'BScontactDetail';
    // subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    // if (!subscription) {
    //   subscription = this.contactsService.BScontactDetail.subscribe((contact: UserModel) => {
    //     console.log('***** DATAIL subscribeBScontactDetail *****BScontactDetail', this.conversationWith, contact);
    //     if (contact && this.conversationWith === contact.uid) {
    //       that.member = contact;
    //     }
    //   });
    //   const subscribe = { key: subscriptionKey, value: subscription };
    //   this.subscriptions.push(subscribe);
    // }


    subscriptionKey = 'messageAdded';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      console.log('***** add messageAdded *****', this.conversationHandlerService);
      subscription = this.conversationHandlerService.messageAdded.subscribe((msg: any) => {
        console.log('CONVERSATION-DETAIL subs to  messageAdded *****', msg);
        if (msg) {
          that.newMessageAdded(msg);
        }
      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }

    subscriptionKey = 'messageChanged';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      subscription = this.conversationHandlerService.messageChanged.subscribe((msg: any) => {
        // console.log('***** DATAIL messageChanged *****', msg);
      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }


    subscriptionKey = 'messageRemoved';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      subscription = this.conversationHandlerService.messageRemoved.subscribe((messageId: any) => {
        // console.log('***** DATAIL messageRemoved *****', messageId);
      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }

    subscriptionKey = 'onGroupChange';
    subscription = this.subscriptions.find(item => item.key === subscriptionKey);
    if (!subscription) {
      subscription = this.groupService.onGroupChange(this.conversationWith).subscribe(groupDetail => {
        this.groupDetail = groupDetail;

        console.log('CONVERSATION-DETAIL group detail INFO CONTENT ....-->', this.groupDetail)
        let memberStr = JSON.stringify(this.groupDetail.members);
        let arrayMembers = [];
        JSON.parse(memberStr, (key, value) => {
          arrayMembers.push(key);
        });

      });
      const subscribe = { key: subscriptionKey, value: subscription };
      this.subscriptions.push(subscribe);
    }
  }

  // generateGroupAvatar(groupDetail) {
  //   groupDetail.color = getColorBck(groupDetail.name);
  //   groupDetail.avatar = avatarPlaceholder(groupDetail.name);
  // }


  /**
   * addEventsKeyboard
   */
  addEventsKeyboard() {
    window.addEventListener('keyboardWillShow', () => {
      console.log('Keyboard will Show');
    });
    window.addEventListener('keyboardDidShow', () => {
      console.log('Keyboard is Shown');
    });
    window.addEventListener('keyboardWillHide', () => {
      console.log('Keyboard will Hide');
    });
    window.addEventListener('keyboardDidHide', () => {
      console.log('Keyboard is Hidden');
    });
  }

  /**
   * unsubscribe all subscribe events
   */
  unsubescribeAll() {
    console.log('||------------> unsubescribeAll 1: ', this.subscriptions);
    if (this.subscriptions) {
      console.log('||------------> unsubescribeAll 2: ', this.subscriptions);
      this.subscriptions.forEach(subscription => {
        subscription.value.unsubscribe(); // vedere come fare l'unsubscribe!!!!
      });
      this.subscriptions = [];

      // https://www.w3schools.com/jsref/met_element_removeeventlistener.asp
      window.removeEventListener('keyboardWillShow', null);
      window.removeEventListener('keyboardDidShow', null);
      window.removeEventListener('keyboardWillHide', null);
      window.removeEventListener('keyboardDidHide', null);
    }
    // this.conversationHandlerService.dispose();
  }
  // -------------- END subscriptionS functions -------------- //





  /**
   * newMessageAdded 
   * @param message
   */
  newMessageAdded(message: MessageModel) {
    // message.text = this.linkifyService.linkify(message.text, this.linkifyOptions);
    // message.text = message.text.trim()
    if (message) {
      console.log('newMessageAdded ++', message);

      // var imageElem = this.getImagesByAlt("file-image-placehoder")[0];
      // var imageElem  =  document.getElementsByTagName("img");
      // console.log('newMessageAdded imageElem', imageElem ) 
      // console.log('message.isSender', message.isSender);
      // console.log('message.status', message.status);
      if (message.isSender) {
        this.scrollBottom(0);
        // this.detectBottom();
      } else if (!message.isSender) {
        if (this.showButtonToBottom) { // NON SONO ALLA FINE
          this.NUM_BADGES++;
        } else { //SONO ALLA FINE
          this.scrollBottom(0);
        }
      }
    }
  }

  updateConversationBadge() {
    if (this.conversationWith && this.conversationsHandlerService && this.conv_type === 'active') {
      this.conversationsHandlerService.setConversationRead(this.conversationWith)
    } else if (this.conversationWith && this.archivedConversationsHandlerService && this.conv_type === 'archived') {
      this.archivedConversationsHandlerService.setConversationRead(this.conversationWith)
    }
  }

  // -------------- START OUTPUT-EVENT handler functions -------------- //
  logScrollStart(event: any) {
    //console.log('logScrollStart : When Scroll Starts', event);
  }

  logScrolling(event: any) {
    // EVENTO IONIC-NATIVE: SCATTA SEMPRE, QUINDI DECIDO SE MOSTRARE O MENO IL BADGE 
    this.detectBottom()
  }

  logScrollEnd(event: any) {
    //console.log('logScrollEnd : When Scroll Ends', event);
  }

  /** */
  returnChangeTextArea(e: any) {
    try {
      let height: number = e.offsetHeight;
      if (height < 50) {
        height = 50;
      }
      this.heightMessageTextArea = height.toString(); //e.target.scrollHeight + 20;
      const message = e.msg; // e.detail.value;
      // console.log('------------> returnChangeTextArea', this.heightMessageTextArea);
      // console.log('------------> returnChangeTextArea', e.detail.value);

      // console.log('------------> returnChangeTextArea loggedUser uid:', this.loggedUser.uid);
      // console.log('------------> returnChangeTextArea loggedUser firstname:', this.loggedUser.firstname);
      // console.log('------------> returnChangeTextArea conversationSelected uid:', this.conversationWith);
      // console.log('------------> returnChangeTextArea channelType:', this.channelType);
      let idCurrentUser = '';
      let userFullname = '';

      // serve x mantenere la compatibilità con le vecchie chat
      // if (this.channelType === TYPE_DIRECT) {
      //   userId = this.loggedUser.uid;
      // }
      idCurrentUser = this.loggedUser.uid;
      // -----------------//
      if (this.loggedUser.firstname && this.loggedUser.firstname !== undefined) {
        userFullname = this.loggedUser.firstname;
      }
      this.typingService.setTyping(this.conversationWith, message, idCurrentUser, userFullname);

      // ----------------------------------------------------------
      // DISPLAY CANNED RESPONSES if message.lastIndexOf("/")
      // ----------------------------------------------------------

      setTimeout(() => {
        var pos = message.lastIndexOf("/");
        console.log("CONVERSATION-DETAIL canned responses pos of / ", pos);
        console.log("pos:: ", pos);
        // if (pos >= 0) {
        if (pos === 0) {
          // && that.tagsCanned.length > 0
          var strSearch = message.substr(pos + 1);
          console.log("CONVERSATION-DETAIL canned responses strSearch ", strSearch);
          this.loadTagsCanned(strSearch);
          //that.showTagsCanned(strSearch);
          //that.loadTagsCanned(strSearch);
        } else {
          this.tagsCannedFilter = [];
        }
      }, 300);
      // ./ CANNED RESPONSES //


      // const elTextArea = this.rowTextArea['el'];
      // this.heightMessageTextArea = elTextArea.offsetHeight;
    } catch (err) {
      console.log('error: ', err);
    }
  }

  // ----------------------------------------------------------
  // @ CANNED RESPONSES methods
  // ----------------------------------------------------------
  loadTagsCanned(strSearch) {
    console.log("CONVERSATION-DETAIL loadTagsCanned strSearch ", strSearch);

    let projectId = ""
    if (this.groupDetail && this.groupDetail['attributes']) {
      console.log("CONVERSATION-DETAIL loadTagsCanned groupDetail ", this.groupDetail);
      projectId = this.groupDetail['attributes']['projectId']

      console.log('CONVERSATION-DETAIL loadTagsCanned groupDetail', this.groupDetail);
      console.log('CONVERSATION-DETAIL loadTagsCanned groupDetail project id', this.groupDetail['attributes']['projectId']);


      const tiledeskToken = this.tiledeskAuthService.getTiledeskToken();
      console.log('CONVERSATION-DETAIL tagsCanned.length', this.tagsCanned.length);
      //if(this.tagsCanned.length <= 0 ){
      this.tagsCanned = [];
      this.cannedResponsesService.getCannedResponses(tiledeskToken, projectId).subscribe(res => {
        console.log('CONVERSATION-DETAIL loadTagsCanned getCannedResponses RES', res);

        this.tagsCanned = res
        this.showTagsCanned(strSearch);

      }, (error) => {
        console.log('CONVERSATION-DETAIL loadTagsCanned getCannedResponses - ERROR  ', error);

      }, () => {
        console.log('CONVERSATION-DETAIL loadTagsCanned getCannedResponses * COMPLETE *');

      });
    }
  }

  showTagsCanned(strSearch) {
    console.log('CONVERSATION-DETAIL showTagsCanned strSearch ', strSearch);
    this.tagsCannedFilter = [];
    var tagsCannedClone = JSON.parse(JSON.stringify(this.tagsCanned));
    console.log('CONVERSATION-DETAIL showTagsCanned tagsCannedClone ', tagsCannedClone);
    //console.log("that.contacts lenght:: ", strSearch);
    this.tagsCannedFilter = this.filterItems(tagsCannedClone, strSearch);
    console.log('CONVERSATION-DETAIL showTagsCanned tagsCannedFilter ', this.tagsCannedFilter);

    this.tagsCannedFilter.sort(compareValues('title', 'asc'));
    var strReplace = strSearch;
    if (strSearch.length > 0) {
      strReplace = "<b class='highlight-search-string'>" + strSearch + "</b>";
    }
    for (var i = 0; i < this.tagsCannedFilter.length; i++) {

      const textCanned = "<div class='cannedText'>" + this.replacePlaceholderInCanned(this.tagsCannedFilter[i].text) + "</div>";
      this.tagsCannedFilter[i].title = "<div class='cannedContent'><div class='cannedTitle'>" + this.tagsCannedFilter[i].title.toString().replace(strSearch, strReplace.trim()) + "</div>" + textCanned + '</div>';

    }
  }

  filterItems(items, searchTerm) {
    console.log('CONVERSATION-DETAIL filterItems tagsCannedClone ', items, ' searchTerm: ', searchTerm);
    //console.log("filterItems::: ",searchTerm);
    return items.filter((item) => {
      //console.log("filterItems::: ", item.title.toString().toLowerCase());
      console.log('CONVERSATION-DETAIL item filtered tagsCannedClone ', item);
      return item.title.toString().toLowerCase().indexOf(searchTerm.toString().toLowerCase()) > -1;
    });
  }

  replacePlaceholderInCanned(str) {

    console.log('CONVERSATION-DETAIL replacePlaceholderInCanned str ', str);

    if (this.groupDetail && this.groupDetail['attributes'] && this.groupDetail['attributes']['userFullname']) {
      str = str.replace('$recipient_name', this.groupDetail['attributes']['userFullname']);
    }
    if (this.loggedUser && this.loggedUser.fullname) {
      str = str.replace('$agent_name', this.loggedUser.fullname);
    }
    return str;
  }

  replaceTagInMessage(canned) {
    this.arrowkeyLocation = -1
    this.tagsCannedFilter = [];
    console.log("CONVERSATION-DETAIL replaceTagInMessage  canned text ", canned.text);
    // // prendo val input
    const elTextArea = this.rowTextArea['el'];
    const textArea = elTextArea.getElementsByTagName('ion-textarea')[0];
    console.log("CONVERSATION-DETAIL replaceTagInMessage  textArea ", textArea);
    console.log("CONVERSATION-DETAIL replaceTagInMessage  textArea value", textArea.value);


    // replace text
    var pos = textArea.value.lastIndexOf("/");
    var strSearch = textArea.value.substr(pos);
    console.log("CONVERSATION-DETAIL replaceTagInMessage  strSearch ", strSearch);

    var strTEMP = textArea.value.replace(strSearch, canned.text);
    strTEMP = this.replacePlaceholderInCanned(strTEMP);
    // strTEMP = this.replacePlaceholderInCanned(strTEMP);
    // textArea.value = '';
    // that.messageString = strTEMP;
    textArea.value = strTEMP;
    setTimeout(() => {
      textArea.focus();
      this.resizeTextArea();
    }, 200);
  }


  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // console.log("CONVERSATION-DETAIL handleKeyboardEvent  event.key ", event.key);

    if (this.tagsCannedFilter.length > 0) {

      if (event.key === 'ArrowDown') {
        this.arrowkeyLocation++;
        if (this.arrowkeyLocation === this.tagsCannedFilter.length) {
          this.arrowkeyLocation--
        }
      }
      else if (event.key === 'ArrowUp') {

        if (this.arrowkeyLocation > 0) {
          this.arrowkeyLocation--;
        } else
          if (this.arrowkeyLocation < 0) {
            this.arrowkeyLocation++;
          }
      }

      if (event.key === 'Enter') {
        //Press action `#${elementArrowIconId}`
        //   const cannedItemEle =  <HTMLElement>document.querySelector(`#canned-item_${this.arrowkeyLocation}`)
        // console.log("CONVERSATION-DETAIL handleKeyboardEvent  cannedItemEle ", cannedItemEle);
        const canned_selected = this.tagsCannedFilter[this.arrowkeyLocation]
        //  console.log("CONVERSATION-DETAIL handleKeyboardEvent  cannedItemEle ", canned_selected);
        this.replaceTagInMessage(canned_selected)

      }
    }
  }
  // ----------------------------------------------------------
  // ./end CANNED RESPONSES methods
  // ----------------------------------------------------------



  /**
     * regola sound message:
     * se lo invio io -> NO SOUND
     * se non sono nella conversazione -> SOUND
     * se sono nella conversazione in fondo alla pagina -> NO SOUND
     * altrimenti -> SOUND
     */
  soundMessage() {
    const that = this;
    this.audio = new Audio();
    // this.audio.src = '/assets/sounds/pling.mp3';
    this.audio.src = URL_SOUND_LIST_CONVERSATION;
    this.audio.load();
    console.log('conversation play', this.audio);
    clearTimeout(this.setTimeoutSound);
    this.setTimeoutSound = setTimeout(function () {
      that.audio.play().then(() => {
        // Audio is playing.
        console.log('****** soundMessage 1 *****', that.audio.src);
      }).catch(error => {
        console.log(error);
      });
    }, 1000);
  }



  /** */


  returnOnBeforeMessageRender(event) {
    //this.onBeforeMessageRender.emit(event)
  }

  returnOnAfterMessageRender(event) {
    // this.onAfterMessageRender.emit(event)
  }

  returnOnMenuOption(event: boolean) {
    // this.isMenuShow = event;
  }

  returnOnScrollContent(event: boolean) {
    // console.log('returnOnScrollContent', event)
    // this.showBadgeScroollToBottom = event;
    // console.log('scroool eventtt', event)
    // //se sono alla fine (showBadgeScroollBottom === false) allora imposto messageBadgeCount a 0
    // if(this.showBadgeScroollToBottom === false){
    //   this.messagesBadgeCount = 0;
    //   //this.updateConversationBadge();
    // }
  }

  returnOnAttachmentButtonClicked(event: any) {
    // console.log('eventbutton', event)
    // if (!event || !event.target.type) {
    //   return;
    // }
    // switch (event.target.type) {
    //   case 'url':
    //     try {
    //       this.openLink(event.target.button);
    //     } catch (err) {
    //       this.g.wdLog(['> Error :' + err]);
    //     }
    //     return;
    //   case 'action':
    //     try {
    //       this.actionButton(event.target.button);
    //     } catch (err) {
    //       this.g.wdLog(['> Error :' + err]);
    //     }
    //     return false;
    //   case 'text':
    //     try{
    //       const text = event.target.button.value
    //       const metadata = { 'button': true };
    //       this.conversationFooter.sendMessage(text, TYPE_MSG_TEXT, metadata);
    //     }catch(err){
    //       this.g.wdLog(['> Error :' + err]);
    //     }
    //   default: return;
    // }
  }

  onImageRenderedFN(event) {
    const imageRendered = event;
    if (this.showButtonToBottom) {
      this.scrollBottom(0)
    }
  }

  addUploadingBubbleEvent(event: boolean) {
    console.log('ION-CONVERSATION-DETAIL (CONVERSATION-DETAIL-PAGE) addUploadingBubbleEvent event', event);
    if (event === true) {
      this.scrollBottom(0);
    }

  }

  // -------------- END OUTPUT-EVENT handler functions -------------- //



  // -------------- END CLICK functions -------------- //



  // -------------- START SCROLL/RESIZE functions -------------- //
  /** */
  resizeTextArea() {
    try {
      const elTextArea = this.rowTextArea['el'];
      const that = this;
      setTimeout(() => {
        const textArea = elTextArea.getElementsByTagName('ion-textarea')[0];
        if (textArea) {
          console.log('messageTextArea.ngAfterViewInit ', textArea);
          const txtValue = textArea.value;
          textArea.value = ' ';
          textArea.value = txtValue;
        }
      }, 0);
      setTimeout(() => {
        if (elTextArea) {
          console.log('text_area.nativeElement ', elTextArea.offsetHeight);
          that.heightMessageTextArea = elTextArea.offsetHeight;
        }
      }, 100);
    } catch (err) {
      console.log('error: ', err);
    }
  }

  /**
   * scrollBottom
   * @param time
   */
  private scrollBottom(time: number) {
    this.showIonContent = true;
    if (this.ionContentChatArea) {
      // this.showButtonToBottom = false;
      // this.NUM_BADGES = 0;
      // this.conversationsHandlerService.readAllMessages.next(this.conversationWith);
      setTimeout(() => {
        this.ionContentChatArea.scrollToBottom(time);
      }, 0);
      // nota: se elimino il settimeout lo scrollToBottom non viene richiamato!!!!!
    }
  }

  /**
   * detectBottom
   */
  async detectBottom() {
    const scrollElement = await this.ionContentChatArea.getScrollElement();

    if (scrollElement.scrollTop < scrollElement.scrollHeight - scrollElement.clientHeight) {
      //NON SONO ALLA FINE --> mostra badge
      this.showButtonToBottom = true;
    } else {
      // SONO ALLA FINE --> non mostrare badge,
      this.showButtonToBottom = false;
    }
  }

  /**
   * Scroll to bottom of page after a short delay.
   */
  public actionScrollBottom() {
    console.log('actionScrollBottom ---> ', this.ionContentChatArea);
    // const that = this;
    this.showButtonToBottom = false;
    this.updateConversationBadge()
    this.NUM_BADGES = 0;
    setTimeout(() => {
      this.ionContentChatArea.scrollToBottom(0);
      // this.conversationsHandlerService.readAllMessages.next(this.conversationWith);
    }, 0);
  }

  /**
   * Scroll to top of the page after a short delay.
   */
  scrollTop() {
    console.log('scrollTop');
    this.ionContentChatArea.scrollToTop(100);
  }

  /** */
  setHeightTextArea() {
    try {
      // tslint:disable-next-line: no-string-literal
      this.heightMessageTextArea = this.rowTextArea['el'].offsetHeight;
    } catch (e) {
      this.heightMessageTextArea = '50';
    }
  }
  // -------------- END SCROLL/RESIZE functions -------------- //

  // -------------------------------------------------------------
  // DRAG FILE 
  // -------------------------------------------------------------

    // DROP (WHEN THE FILE IS RELEASED ON THE DROP ZONE)
    drop(ev: any) {
      ev.preventDefault();
      ev.stopPropagation();
  
      console.log('CONVERSATION-DETAIL ----> FILE - DROP ev ', ev);
      const fileList = ev.dataTransfer.files;
      console.log('CONVERSATION-DETAIL ----> FILE - DROP ev.dataTransfer.files ', fileList);
      this.isHovering = false;
      console.log('CONVERSATION-DETAIL ----> FILE - DROP isHovering ',  this.isHovering);
      if (fileList.length > 0) {
        const file: File = fileList[0];
        console.log('CONVERSATION-DETAIL ----> FILE - DROP file ', file);
  
        var mimeType = fileList[0].type;
        console.log('CONVERSATION-DETAIL ----> FILE - drop mimeType files ', mimeType);
  
        if (mimeType.startsWith("image")) {
  
          this.handleDropEvent(ev);
          // this.uploadedFileName = this.uploadedFile.name
          // console.log('Create Faq Kb - drop uploadedFileName ', this.uploadedFileName);
  
          // this.handleFileUploading(file);
          // this.doFormData(file)
        } else {
          console.log('CONVERSATION-DETAIL ----> FILE - drop mimeType files ', mimeType, 'NOT SUPPORTED FILE TYPE');
        }
      }
    }

    handleDropEvent(ev)  {
      console.log('CONVERSATION-DETAIL ----> FILE - HANDLE DRAGGED FILE-LIST ', ev);
      this.dropEvent = ev
    }

      // DRAG OVER (WHEN HOVER OVER ON THE "DROP ZONE")
  allowDrop(ev: any) {
    ev.preventDefault();
    ev.stopPropagation();
    console.log('CONVERSATION-DETAIL----> FILE - (dragover) allowDrop ev ', ev);
    this.isHovering = true;
    console.log('CONVERSATION-DETAIL----> FILE - (dragover) allowDrop isHovering ',  this.isHovering);
  }

    // DRAG LEAVE (WHEN LEAVE FROM THE DROP ZONE)
    drag(ev: any) {
      ev.preventDefault();
      ev.stopPropagation();
      console.log('CONVERSATION-DETAIL----> FILE - (dragleave) drag ev ', ev);
      this.isHovering = false;
      console.log('CONVERSATION-DETAIL ----> FILE - FILE - (dragleave) drag his.isHovering ',  this.isHovering);
    }

}
// END ALL //