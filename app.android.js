/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import firebase from 'react-native-firebase';
const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});
const adMob=firebase.admob();
adMob.initialize('ca-app-pub-3940256099942544~3347511713');
const Banner = firebase.admob.Banner;
const AdMobRequest = firebase.admob.AdRequest;
const adRequest = new AdMobRequest();
const admobInterstitial = firebase.admob().interstitial('ca-app-pub-3940256099942544/1033173712');
if (admobInterstitial.isLoaded()) {
  admobInterstitial.show();
}
type Props = {};
export default class App extends Component<Props> {
  render() {
    return (
      <View style={styles.container}>
        <Banner
          unitId={'ca-app-pub-3940256099942544/6300978111'}
          size={'SMART_BANNER'}
          request={adRequest.build()}
          onAdLoaded={() => {
            console.log('Advert loaded');
          }}
        />
        <Text style={styles.welcome}>Welcome to React Native!</Text>
        <Text style={styles.instructions}>To get started, edit App.js</Text>
        <Text style={styles.instructions}>{instructions}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
