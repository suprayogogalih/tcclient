import React, { Component } from 'react';
import {
  Dimensions, StyleSheet, View, Text,
  NativeModules,
} from 'react-native';
import MapView from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE = 37.771707;
const LONGITUDE = -122.4053769;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const GOOGLE_MAPS_APIKEY = 'AIzaSyA3KMhK3xy20XzhcHcr6A4dosPEix4SRZA';

const { reactNativeVersion } = NativeModules.PlatformConstants;
const reactNativeVersionString = reactNativeVersion ? `${reactNativeVersion.major}.${reactNativeVersion.minor}.${reactNativeVersion.patch}${reactNativeVersion.prerelease ? ' pre-release' : ''}` : '';

const reactNativeMapsVersion = require('../../../../node_modules/react-native-maps/package.json').version;
const reactNativeMapsDirectionsVersion = require('../../../../node_modules/react-native-maps-directions/package.json').version;

const styles = StyleSheet.create({
  versionBox: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  versionText: {
    padding: 4,
    backgroundColor: '#FFF',
    color: '#000',
  },
});

class MapDirection extends Component {
  constructor(props) {
    super(props);

    this.state = {
      coordinates: [
        {
          latitude: 37.3317876,
          longitude: -122.0054812,
        },
        {
          latitude: 37.771707,
          longitude: -122.4053769,
        },
      ],
    };

    this.mapView = null;
  }

  onMapPress = (e) => {
    this.setState({
      coordinates: [
        ...this.state.coordinates,
        e.nativeEvent.coordinate,
      ],
    });
  }

  onReady = (result) => {
    this.mapView.fitToCoordinates(result.coordinates, {
      edgePadding: {
        right: (width / 10),
        bottom: (height / 10),
        left: (width / 10),
        top: (height / 10),
      },
    });
  }

  onError = (errorMessage) => {
    console.log(errorMessage);
  }

  setDistance(distance, duration_in_traffic) {
    // console.log('setDistance');
    this.setState({
      distance: parseFloat(distance),
      durationInTraffic: parseInt(duration_in_traffic),
    });
  }

  render() {
    return (
      <View style={StyleSheet.absoluteFill}>
        <MapView
          initialRegion={{
            latitude: LATITUDE,
            longitude: LONGITUDE,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          style={StyleSheet.absoluteFill}
          ref={(c) => this.mapView = c}
          onPress={this.onMapPress}
        >
        {this.state.coordinates.map((coordinate, index) =>
          <MapView.Marker key={`coordinate_${index}`} coordinate={coordinate} />
        )}
          <MapViewDirections
            origin={this.state.coordinates[0]}
            destination={this.state.coordinates[this.state.coordinates.length - 1]}
            waypoints={this.state.coordinates.slice(1, -1)}
            mode="DRIVING"
            apikey={GOOGLE_MAPS_APIKEY}
            language="en"
            strokeWidth={4}
            strokeColor="black"
            onStart={(params) => {
              console.log(`Started routing between "${params.origin}" and "${params.destination}"${(params.waypoints.length ? ` using waypoints: ${params.waypoints.join(', ')}` : '')}`);
            }}
            onReady={this.onReady}
            onError={(errorMessage) => {
              console.log(errorMessage);
            }}
            resetOnChange={false}
          />
        </MapView>
        <View style={styles.versionBox}>
          <Text style={styles.versionText}>
            RN
            {' '}
            {reactNativeVersionString}
            , RNM:
            {' '}
            {reactNativeMapsVersion}
            , RNMD:
            {' '}
            {reactNativeMapsDirectionsVersion}
          </Text>
        </View>
      </View>
    );
  }
}

export default MapDirection;
