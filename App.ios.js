import React, {Component} from 'react';
import {I18nManager,TextInput,CameraRoll,Text,StyleSheet,View,ActivityIndicator,Dimensions,TouchableOpacity,ScrollView} from 'react-native';
import { WebView } from 'react-native-webview';
import SafeAreaView from 'react-native-safe-area-view';
import Icon from 'react-native-vector-icons/dist/MaterialCommunityIcons';
import { LogLevel, RNFFmpeg } from 'react-native-ffmpeg';
import Video from 'react-native-video';
import KeepAwake from 'react-native-keep-awake';
import * as RNLocalize from "react-native-localize";
import ProgressBar from 'react-native-progress/Bar';
import i18n from "i18n-js";
import memoize from "lodash.memoize";
var RNFS = require('react-native-fs');
import firebase from 'react-native-firebase';
type Props = {};

const translationGetters = {
  // lazy requires (metro bundler does not support symlinks)
  zh: () => require("./translations/zh.json"),
  en: () => require("./translations/en.json"),
};

const translate = memoize(
  (key, config) => i18n.t(key, config),
  (key, config) => (config ? key + JSON.stringify(config) : key),
);

const setI18nConfig = () => {
  // fallback if no available language fits
  const fallback = { languageTag: "en", isRTL: false };

  const { languageTag, isRTL } =
    RNLocalize.findBestAvailableLanguage(Object.keys(translationGetters)) ||
    fallback;

  // clear translation cache
  translate.cache.clear();
  // update layout direction
  I18nManager.forceRTL(isRTL);

  // set i18n-js config
  i18n.translations = { [languageTag]: translationGetters[languageTag]() };
  i18n.locale = languageTag;
};

const adMob=firebase.admob();
adMob.initialize('ca-app-pub-9423956224812067~2558712326');
const Banner = firebase.admob.Banner;
const AdMobRequest = firebase.admob.AdRequest;
const adRequest = new AdMobRequest();
const admobInterstitial = firebase.admob().interstitial('ca-app-pub-9423956224812067/9100007274');
admobInterstitial.loadAd(adRequest.build());
admobInterstitial.on('onAdLoaded', () => {
  admobInterstitial.show();
});
export default class App extends Component<Props> {

  constructor(props) {
    super(props);
    this.state = { 
      mainUrl:'',
      wingmanUrl:'',
      wingmanTwoUrl:'',
      wingmanThreeUrl:'',
      addressBarUrl:'',
      videoNum:0,
      videoListShow:false,
      fetchingGoingon:false,
      downloadingAndConvertingGoingOn:false,
      currentDownloadingUrl:'',
      downloadProcessIndicatorText:'',
      loadingProgress:0,
      showM3u8ErrorView:false,
      errorM3u8Name:'',
      errorM3u8Url:''  
      
    };
    setI18nConfig(); 
  }  

  componentDidMount(){
    KeepAwake.activate();
    RNLocalize.addEventListener("change", this.handleLocalizationChange);     
  }

  componentWillUnmount() {
    RNLocalize.removeEventListener("change", this.handleLocalizationChange);
  }
  
  handleLocalizationChange = () => {
    setI18nConfig();
    this.forceUpdate();
  };  

  static filteredMedias=[];
  static filteredHtmls=[];
  static fetchingList=[];
  static urlInputed='';
  static initialUrl= RNLocalize.getLocales()[0].countryCode == 'CN' ? 'https://cn.bing.com/' : 'https://www.google.com/';
  static initialWingmanUrl='';
  static wingmanLoaded=false;
  static wingmanTwoLoaded=false;  
  static wingmanThreeLoaded=false;

  urlSubmit=(e)=>{
    this.setState({showM3u8ErrorView:false});    
    if(this.validURL(App.urlInputed)){
      if(App.urlInputed.indexOf('.m3u8') >= 0){
        this.determinSourceType(App.urlInputed,true);
      }
      else{
        this.setState({mainUrl:App.urlInputed});
      }
    }
    else{
      this.setState({errorM3u8Name:'webviewLoadingErrMsg',errorM3u8Url:App.urlInputed,showM3u8ErrorView:true});
    }

  }

  urlInput=(url)=>{
    App.urlInputed=url;
  }

  validURL=(str)=> {
    let pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ //port
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i');
    let pat=/^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/
    return pat.test(str);
  }

  browserLoadingIndicator=()=>{
    return(
      <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <ActivityIndicator size="small" color="#F66" />
        <Text numberOfLines={1} style={{padding:10}}>
          {translate('webviewLoadingIndicatorTxt')}
        </Text>
      </View>
    )
  }

  browserErrorView=(error)=>{

    return(
      <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#FFFFFF'}}>
        <Text numberOfLines={5} style={{padding:10,fontSize:16,color:'#F66'}}>
        {translate('webviewLoadingErrMsg')} : {this.state.mainUrl || App.initialUrl}       
        </Text>
        <Banner
          unitId={'ca-app-pub-9423956224812067/1542572144'}
          size={'LARGE_BANNER'}
          request={adRequest.build()}
          onAdLoaded={() => {
            console.log('Advert loaded');
          }}
        />  
      </View>
    )
  }

  showM3u8ErrorView=()=>{  
    return(
      <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#FFFFFF'}}>
        <Text numberOfLines={5} style={{padding:10,fontSize:16,color:'#F66'}}>
        {translate(this.state.errorM3u8Name)} : {this.state.errorM3u8Url}       
        </Text>
        <Banner
          unitId={'ca-app-pub-9423956224812067/8591551448'}
          size={'LARGE_BANNER'}
          request={adRequest.build()}
          onAdLoaded={() => {
            console.log('Advert loaded');
          }}
        />  
      </View>
    )    
  }

  onMessageFromWebview=(data)=>{
    let videoUrls=data.nativeEvent.data;
    let vurls=videoUrls.split('|');
    let videoCnt=0;
    vurls.forEach(function(item){
      if(App.filteredMedias.map(function(e) { return e.url; }).indexOf(item) < 0){
        App.filteredMedias.push({'url':item,'type':'video',subtype:'unknown'});
        videoCnt +=1;        
      }
    });
    this.setState({videoNum:this.state.videoNum+videoCnt});
    console.log('found video: ' + data.nativeEvent.data);
  }

  wingmanNavStateChange=(evt)=>{
    if(evt.loading){
        App.wingmanLoaded=false;
    }
    else{
        App.wingmanLoaded=true;
    }
  }

  wingmanTwoNavStateChange=(evt)=>{
    if(evt.loading){
        App.wingmanTwoLoaded=false;
    }
    else{
        App.wingmanTwoLoaded=true;
    }
  }
  
  wingmanThreeNavStateChange=(evt)=>{
    if(evt.loading){
        App.wingmanThreeLoaded=false;
    }
    else{
        App.wingmanThreeLoaded=true;
    }
  }  

  injectJavascriptWingman=()=>{
    this.wingman.injectJavaScript(this.videoSearcher());
  }

  injectJavascriptWingmanTwo=()=>{
    this.wingmanTwo.injectJavaScript(this.videoSearcher());
  }
  
  injectJavascriptWingmanThree=()=>{
    this.wingmanThree.injectJavaScript(this.videoSearcher());
  }  

  injectJavascriptBrowser=()=>{

    this.browser.injectJavaScript(this.videoSearcher());
  }  

  videoSearcher=()=>{

    const code=`
    var foundVids=[];
    var lastSentUrls=[];
    try{
      (function() {
        var origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            console.log('request started!');
            this.addEventListener('loadend', function() {
                console.log('request completed!');
                console.log(this.readyState); //will always be 4 (ajax is completed successfully)
                console.log(this.responseText); //whatever the response was
                let contentType=this.getResponseHeader("Content-Type").split(';')[0].toLowerCase().trim();
                let types=contentType.split('/');
                console.log('ajax type : ' + types[0]);
                if(types[0]=='video'){
                  if(foundVids.indexOf(url)<0){
                    foundVids.push(encodeURI(url));
                  }
                }
                else if(types[0]=='application' && types[1]=='vnd.apple.mpegurl'){
                  if(foundVids.indexOf(url)<0){
                    foundVids.push(encodeURI(url));
                  }                  
                }
            });
            origOpen.apply(this, arguments);
        };
      })();

    }catch(e){
      console.log(e);
    }

    function arr_diff (a1, a2) {

      var a = [], diff = [];
  
      for (var i = 0; i < a1.length; i++) {
          a[a1[i]] = true;
      }
  
      for (var i = 0; i < a2.length; i++) {
          if (a[a2[i]]) {
              delete a[a2[i]];
          } else {
              a[a2[i]] = true;
          }
      }
  
      for (var k in a) {
          diff.push(k);
      }
  
      return diff;
    }    
    var reactNtimer=setInterval(() => {
            try{
              let mediaDoms=document.querySelectorAll('video');
              if(mediaDoms.length>0){
                  mediaDoms.forEach(function(item) {
                    let src=item.getAttribute('src');
                    if(!src){
                      let sourceDom=item.getElementsByTagName('source');
                      if(sourceDom.length >0){
                        src=sourceDom[0].getAttribute('src');
                      }
                    }
                    if(src && foundVids.indexOf(src) < 0){
                      foundVids.push(encodeURI(src));
                    }
                  }); 
                  let diff=arr_diff(foundVids,lastSentUrls);
                  if(diff.length > 0){
                    window.ReactNativeWebView.postMessage(diff.join('|'));
                    let newDiff=lastSentUrls.concat(diff);
                    lastSentUrls=newDiff;
                    //clearInterval(reactNtimer);
                  }
              }
            }
            catch(e){
              console.log(e);
            }
          }, 1000);
          true; ` ;
   
      return code;        
  }


  browserNavigationStateChange=(evt)=>{  

    if(evt.loading){
      this.setState({videoNum:0});
      this.setState({videoListShow:false});
      App.filteredMedias=[];
      App.filteredHtmls=[];
      App.fetchingList=[];
      this.addressBar.clear();        
    }
    else{ 
      this.setState({addressBarUrl:evt.url == App.initialUrl ? '' : evt.url});     
    }

  }

  toggleMediaList=()=>{
    this.setState({ videoListShow: !this.state.videoListShow });
  }

  browserRequestHandler=(evt)=>{
    /* be ware , that async request will only fire after webview loading event firing*/
    console.log('request coming: ' + evt.url +' type: ' + evt.navigationType);

    if(this.validURL(evt.url)){
      if(evt.url !== App.initialUrl){
        this.determinSourceType(evt.url,false);
      }
    }

    return true;
  }

  async determinSourceType(url,m3u8UserInputed) {

      if(App.fetchingList.indexOf(url) < 0 && url !== App.initialUrl && url !== this.state.mainUrl){
        App.fetchingList.push(url);

        try {

          if(!this.state.fetchingGoingon){
            this.setState({fetchingGoingon:true});
          }
          console.log('fetching: ' + url);
          let response = await fetch(url,{method: "HEAD"});            
          console.log(url + ': '+ response.status);
          if(response.ok){   
        
            let contentType=response.headers.map['content-type'].split(';')[0].toLowerCase().trim();
            let types=contentType.split('/');

              if(types[0]=='video'){
                if(App.filteredMedias.map(function(e) { return e.url; }).indexOf(response.url) < 0){
                  App.filteredMedias.push({'url':response.url,'type':types[0],subtype:types[1]});
                  this.setState({videoNum:this.state.videoNum+1});
                }
              }
              else if(types[0]=='application' && types[1]== 'vnd.apple.mpegurl'){
                if(App.filteredMedias.map(function(e) { return e.url; }).indexOf(response.url) < 0){
                  App.filteredMedias.push({'url':response.url,'type':types[0],subtype:types[1]});
                  this.setState({videoNum:this.state.videoNum+1});
                  if(m3u8UserInputed==true){
                    this.toggleMediaList();
                  }
                }                
              }
              else if(types[0]=='text' && types[1]=='html'){
                if(App.filteredHtmls.map(function(e) { return e.url; }).indexOf(response.url) < 0){
                    App.filteredHtmls.push({'url':response.url,'type':types[0],subtype:types[1]});
                    let wingmen=["wingmanUrl","wingmanTwoUrl","wingmanThreeUrl"]
                    function getRandomInt(min, max) {
                        min = Math.ceil(min);
                        max = Math.floor(max);
                        return Math.floor(Math.random() * (max - min + 1)) + min;
                    }      
                    let rand=getRandomInt(0,2);
                    if(wingmen[rand]=='wingmanUrl'){
                        this.setState({wingmanUrl:response.url}); 
                        console.log(response.url + ' rendered by wingman one');                         
                    }
                    else if(wingmen[rand]=='wingmanTwoUrl'){
                        this.setState({wingmanTwoUrl:response.url}); 
                        console.log(response.url + ' rendered by wingman two');    
                                           
                    }                    
                    else if(wingmen[rand]=='wingmanThreeUrl'){
                        this.setState({wingmanThreeUrl:response.url}); 
                        console.log(response.url + ' rendered by wingman three');    
                                       
                    }                      
                                                 
      
                  console.log(App.filteredHtmls);
                } 
  
              }
              else{
                if(m3u8UserInputed==true){
                  this.setState({showM3u8ErrorView:true,errorM3u8Name:'probingFail',errorM3u8Url:url});
                }
              }
              console.log(response);            
                     
          }
          else{
            if(m3u8UserInputed==true){
              this.setState({showM3u8ErrorView:true,errorM3u8Name:'webviewLoadingErrMsg',errorM3u8Url:url});
            }
          }
          if(this.state.fetchingGoingon){
            this.setState({fetchingGoingon:false});
          }    
          
        } catch (error) {
          if(m3u8UserInputed==true){
            this.setState({showM3u8ErrorView:true,errorM3u8Name:'webviewLoadingErrMsg',errorM3u8Url:url});
          }          
          if(this.state.fetchingGoingon){
            this.setState({fetchingGoingon:false});
          }
          console.error(error);
        }        
      }
      else{
        console.log('already fetching: ' + url);
      }
        
  }
 

  startProbing=(url)=>{

    if(this.state.downloadingAndConvertingGoingOn){
      return;
    }
    this.setState({currentDownloadingUrl:url,downloadProcessIndicatorText:translate('probing'),downloadingAndConvertingGoingOn:true},()=>{
      console.log('start: ' + this.state.currentDownloadingUrl);
      RNFFmpeg.getMediaInformation(this.state.currentDownloadingUrl).then(info => {
        console.log('Result: ' + JSON.stringify(info));
        let format=info.format;
        let bitrate=info.bitrate;
        let duration=info.duration/1000;
        let framerate=0;
        let vcodec='';
        let acodec='';
        let vwidth=0;
        let vheight=0;
        if(info.streams.length > 0){
          for (let i = 0; i < info.streams.length; i++) {
            let type=info.streams[i].type.toLowerCase();
            if(type == 'video'){
              vcodec=info.streams[i].codec.toLowerCase();
              vwidth=info.streams[i].width;
              vheight=info.streams[i].height;
              framerate=info.streams[i].realFrameRate;
            }
            else if(type == 'audio'){
              acodec=info.streams[i].codec.toLowerCase();
            }
          }
          let infoTxt=vwidth + '*' + vheight +',' + bitrate + 'kbs,' + duration + 's,' + vcodec+'/'+acodec + ','+ framerate +'fps';
          this.setState({downloadProcessIndicatorText:infoTxt},()=>{
            setTimeout(()=>{this.startDownload(url,vcodec,acodec);},2000)
          });          
        }
        else{
          this.setState({downloadProcessIndicatorText:translate('probingFail'),downloadingAndConvertingGoingOn:false});          
        }

      });
    });

  }

  startDownload=(url,vcodec,acodec)=>{
    let desiredVcodec='h264';
    let desiredAcodec='aac';
    let desidredContainer='mp4';
    let ffargs=[];
    let fileName=RNFS.CachesDirectoryPath+'/'+ Date.now() +'.'+ desidredContainer;
    ffargs.push('-i');
    ffargs.push(url);

    ffargs.push('-c:v');
    if(vcodec == desiredVcodec){
      ffargs.push('copy');
    }
    else{
      ffargs.push('libx264');
    }

    ffargs.push('-c:a');
    if(acodec == desiredAcodec){
      ffargs.push('copy');      
    }
    else{
      ffargs.push('aac');
    } 

    ffargs.push(fileName);
    this.setState({downloadProcessIndicatorText:translate('downloading')});
    RNFFmpeg.executeWithArguments(ffargs).then((result) => {
      console.log("FFmpeg process exited with rc " + result.rc);
      if(result.rc===0){
        //this.setState({downloadProcessIndicatorText:'successfully downloaded'});
        /* move downloaded to gallery for better user experiene*/
        this.saveVideoToGallery(fileName);
        
      }
      else{
        this.setState({downloadProcessIndicatorText:translate('videoDownloadingErrMsg')});
      }
      this.setState({downloadingAndConvertingGoingOn:false});
      
    });
  }


  saveVideoToGallery=(fileName)=>{

    CameraRoll.saveToCameraRoll(fileName, 'video')
    .then(this.setState({downloadProcessIndicatorText:translate('videoSaveSuccessMsg')}))
    .catch((err) => {this.setState({downloadProcessIndicatorText:translate('videoSaveFailMsg')});console.log('save to gallery err:', err)})            

  }


  showVideoPreviews=()=>{
    let videoPreviews=[];
    if(this.state.videoNum>0){
      for(let i=0;i<App.filteredMedias.length;i++){
        let vurl=App.filteredMedias[i]['url'];
        videoPreviews.push(
          <View style={styles.scrollableModalVideoPreview} key = {'vpreview'+i}>
            <Video source={{uri: vurl}} style={styles.videoPreview}  resizeMode="contain" controls={true} paused={true}
              onBuffer={(evt)=>{console.log(evt)}}                
              onError={(evt)=>{console.log(evt)}}
             />
             <View style={styles.videoToolBar}>
              {
                this.state.currentDownloadingUrl==vurl 
                ? <TouchableOpacity onPress={()=>{}} style={styles.vtoolBarTouchable}>{this.state.downloadingAndConvertingGoingOn && <ActivityIndicator size="small" color="#F66" />}<Text numberOfLines={1} style={{fontSize:13,color:'#F66',paddingLeft:10}}>{this.state.downloadProcessIndicatorText || translate('videoProcessingIndicatorText')} </Text></TouchableOpacity>
                : <TouchableOpacity onPress={()=>{this.startProbing(vurl)}} style={styles.vtoolBarTouchable}><Icon name={'cloud-download'} size={30} color={'#F66'} /><Text numberOfLines={1} style={{fontSize:16,color:'#000',paddingLeft:10}}>{translate('downloadButtonText')}</Text></TouchableOpacity>
              }
             </View>
          </View>
          
        );
      }
      return videoPreviews;
    }
    return null;
  }

  showFetchingStatus=()=>{
    if(this.state.fetchingGoingon==true){
      return <ActivityIndicator size="small" color="#F66" />;
    }
    return (
      <TouchableOpacity onPress={this.toggleMediaList}>
        <Icon name={'numeric-' + (this.state.videoNum > 9 ? '9-plus' : this.state.videoNum) + '-circle'} size={30} color={this.state.videoNum > 0 ? '#F66' : '#666'} />
      </TouchableOpacity>
    )
  }

  render() {    

    return (
      <SafeAreaView style={{backgroundColor:'#F66'}}>

        <View style={{backgroundColor:'#FFF',height:'100%',width:'100%'}} onLayout={(evt)=>{this.setState({safeareaHeight:evt.nativeEvent.layout.height,safeY:evt.nativeEvent.layout.y})}}>

          <View style={styles.topBar}>
            <TextInput style={styles.addressBar} ref={ref => this.addressBar = ref} placeholder={this.state.addressBarUrl || translate('urlPlaceHolderText')} onChangeText={this.urlInput} multiline={false} onSubmitEditing={this.urlSubmit}/>
            <View style={styles.menuIconView}>
              {this.showFetchingStatus()}
            </View>
          </View>
          <ProgressBar color={'#F66'} progress={this.state.loadingProgress} width={null} height={2} borderRadius={0} borderWidth={0}/>
          <View style={styles.webviewContainer}>
            {
              this.state.showM3u8ErrorView ? 
              this.showM3u8ErrorView()
              :
              <WebView source={{uri: this.state.mainUrl ? this.state.mainUrl : App.initialUrl}} 
                ref={ref => this.browser = ref}
                mediaPlaybackRequiresUserAction={true}
                allowsInlineMediaPlayback={true}
                renderLoading={this.browserLoadingIndicator}
                renderError={this.browserErrorView}
                mixedContentMode={'always'}
                startInLoadingState={true}             
                onShouldStartLoadWithRequest={this.browserRequestHandler}
                onNavigationStateChange={this.browserNavigationStateChange}
                onMessage={this.onMessageFromWebview}
                onLoad={this.injectJavascriptBrowser}
                useWebKit={true}
                onLoadProgress={({ nativeEvent }) => {
                  this.state.loadingProgress = nativeEvent.progress;
                }}              
                onLoadEnd={(evt)=>{this.setState({loadingProgress:0})}}
              />             
            }
          </View>          
        </View> 
        <View style={styles.wingman}>
          <WebView source={{uri: this.state.wingmanUrl || App.wingmanUrl}} 
          ref={ref => this.wingman = ref}
          mixedContentMode={'always'}
          mediaPlaybackRequiresUserAction={true}
          allowsInlineMediaPlayback={true}
          onMessage={this.onMessageFromWebview}
          onLoad={this.injectJavascriptWingman}
          useWebKit={true}
          onNavigationStateChange={this.wingmanNavStateChange}
          />
          <WebView source={{uri: this.state.wingmanTwoUrl || App.wingmanUrl}} 
          ref={ref => this.wingmanTwo = ref}
          mixedContentMode={'always'}
          mediaPlaybackRequiresUserAction={true}
          allowsInlineMediaPlayback={true}
          onMessage={this.onMessageFromWebview}
          onLoad={this.injectJavascriptWingmanTwo}
          useWebKit={true}
          onNavigationStateChange={this.wingmanTwoNavStateChange}
          />
          <WebView source={{uri: this.state.wingmanThreeUrl || App.wingmanUrl}} 
          ref={ref => this.wingmanThree = ref}
          mixedContentMode={'always'}
          mediaPlaybackRequiresUserAction={true}
          allowsInlineMediaPlayback={true}
          onMessage={this.onMessageFromWebview}
          onLoad={this.injectJavascriptWingmanThree}
          useWebKit={true}
          onNavigationStateChange={this.wingmanThreeNavStateChange}
          />                    
        </View>      
        
        {this.state.videoListShow ?                   
        (
          <View style={{width:'100%',height:this.state.safeareaHeight - 60,marginTop:60 + this.state.safeY,backgroundColor:'#000',position:'absolute',zIndex:10}}>
          <ScrollView ref={ref => (this.scrollViewRef = ref)} style={{height:Dimensions.get('window').height -64}} contentContainerStyle={{flexGrow: 1 }}>        
           
              <Banner
                unitId={'ca-app-pub-9423956224812067/5673388845'}
                size={'FULL_BANNER'}
                request={adRequest.build()}
                onAdLoaded={() => {
                  console.log('Advert loaded');
                }}
              />  
            {this.showVideoPreviews()}     
            {this.state.videoNum > 0 ?
              <Banner
                unitId={'ca-app-pub-9423956224812067/5673388845'}
                size={'FULL_BANNER'}
                request={adRequest.build()}
                onAdLoaded={() => {
                  console.log('Advert loaded');
                }}
              />
              :
              <Text numberOfLines={1} style={{padding:10,fontSize:16,color:'#FFF',textAlign:'center'}}>
                {translate('videoZeroMsg')}
            </Text>                
            }  

          </ScrollView>                    
        </View>
        )  : null
        }             
      </SafeAreaView>            
    );
  }

}
const styles = StyleSheet.create({
  topBar:{
    backgroundColor:'#FFF',    
    height:54,
    paddingLeft:10,
    paddingRight:10,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: "#DDD"
  },
  addressBar:{
    width:Dimensions.get('window').width - 40 - 10 *2 -10,
    height:40,
    backgroundColor:'#EEEEEE',
    borderRadius:5,
    paddingLeft:10,
    paddingRight:10
  },

  menuIconView:{
    height:40,
    width:40,
    marginLeft:10,
    backgroundColor:'#FFFFFF',
    flex:1,
    justifyContent:'center',
    alignItems:'center'
  },
  webviewContainer:{
    marginTop:4,
    backgroundColor:'#ccc',
    flex:1,
    overflow:'hidden'
  },
  
  wingman:{
    width:0,
    height:0,
    position:'absolute',
    right:0,
    bottom:0,
    zIndex:0,
    overflow:'hidden'
  },

  scrollableModalVideoPreview: {
    height: 230,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPreview:{
    width:'100%',
    height:200
  },
  videoToolBar:{
    backgroundColor:'#ccc',
    width:'100%',
    height:30,
    flex:1
  },
  vtoolBarTouchable:{
    flex:1,
    flexDirection:'row',
    justifyContent:"center",
    alignItems:'center'
  }
});  


