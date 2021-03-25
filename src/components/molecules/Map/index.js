import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Dimensions, Text, Animated, Image, ScrollView, TouchableOpacity, BackHandler
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import Geolocation from '@react-native-community/geolocation';
import MapViewDirections from 'react-native-maps-directions';
import { clearWatch } from 'react-native-geolocation-service';
import { fonts, colors, showError } from '../../../utils';
import { IconMarker, IconGoogle } from '../../../assets';
import { Gap, ButtonModal } from '../..';
import { Button } from '..';
import {
  getUser, service
} from '../../../config';
import { globalAction } from '../../../redux';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const CARD_HEIGHT = 220;
const CARD_WIDTH = width * 0.8;
const SPACING_FOR_CARD_INSET = width * 0.1 - 10;
const GOOGLE_MAPS_APIKEY = 'AIzaSyA3KMhK3xy20XzhcHcr6A4dosPEix4SRZA';

const Map = ({ navigation }) => {
  const consumer = useSelector((state) => state.consumerReducer);
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = setTimeout(async () => {
      await getUser('coffees').then((res) => {
        if (res !== 'undefined') {
          setCoffeeCoordinates(res);
        } else {
          showError('Terjadi Kesalahan, silahkan ulangi kembali');
        }
      });
    }, 200);
    return () => clearTimeout(unsubscribe);
  }, []);

  useEffect(() => {
    const unsubscribe = setTimeout(async () => {
      await getUser('consumer').then((res) => {
        const initialPosition = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        setOriginCoordinate(initialPosition);
        dispatch({ type: globalAction.SET_CONSUMER, value: res });
      });
    }, 100);
    return () => clearTimeout(unsubscribe);
  }, []);

  useEffect(() => {
    onScrollCardToMarker();
  });

  useEffect(() => {
    BackHandler.addEventListener('backPress', onDisable);
    return () =>
      BackHandler.removeEventListener('backPress', onDisable);
  });

  const [coffeeCoordinates, setCoffeeCoordinates] = useState([]);
  const [originCoordinate, setOriginCoordinate] = useState({
    latitude: 0,
    longitude: 0
  });
  const [destinationCoordinate, setDestinationCoordinate] = useState({
    latitude: 0,
    longitude: 0
  });

  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [direct, setDirect] = useState(false);
  const [cardFooter, setCardFooter] = useState(true);
  const [cardHeader, setCardHeader] = useState(true);
  const [cardButton, setCardButton] = useState(false);
  const [time, setTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [zoom, setZoom] = useState(15);
  const [boxOne, setBoxOne] = useState(true);
  const [boxTwo, setBoxTwo] = useState(false);
  let mapIndex = 0;
  const mapAnimation = new Animated.Value(0);

  const onDisable = () => {
    if (cardButton === false && direct === false) {
      clearProm();
      navigation.replace('Splash');
      return false;
    }
    if (cardButton === true) {
      offStart();
      return true;
    }
    if (direct === true) {
      setDirect(false);
      return true;
    }
  };

  const clearProm = () => {
    service.post('/api/auth/clear', {
      consumerId: consumer.consumerId
    }).then((response) => {
      console.log(response.data.message);
    }).catch((error) => {
      console.log(error.message);
    });
  };

  const getMapRegion = () => ({
    latitude: originCoordinate.latitude,
    longitude: originCoordinate.longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });

  const watchPosition = () => {
    const watchId = Geolocation.watchPosition(
      (position) => {
        const changeOriginCoordinate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setOriginCoordinate(changeOriginCoordinate);
        // setRouteCoordinates(routeCoordinates.concat([changeOriginCoordinate]));
      },
      (error) => alert(error.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 },
    );
    return () => clearWatch(watchId);
  };

  const onReady = (result) => {
    _map.current.fitToCoordinates(result.coordinates, {
      edgePadding: {
        right: (width / 10),
        bottom: (height / 10),
        left: (width / 10),
        top: (height / 10),
      },
    });
    setTime(result.duration);
    setDistance(parseFloat(result.distance).toFixed(1));
  };

  const onMapViewDirection = () => (
    <MapViewDirections
      origin={originCoordinate}
      destination={destinationCoordinate}
      waypoints={routeCoordinates.slice(1, 0)}
      mode="DRIVING"
      apikey={GOOGLE_MAPS_APIKEY}
      language="en"
      strokeWidth={4}
      strokeColor="blue"
      onStart={(params) => {
        console.log(`Started routing between "${params.origin}" and "${params.destination}"`);
      }}
      onReady={onReady}
    />
  );

  const onScrollCardToMarker = () => {
    mapAnimation.addListener(({ value }) => {
      let index = Math.floor(value / CARD_WIDTH + 0.3);
      if (index >= coffeeCoordinates.length) {
        index = coffeeCoordinates.length - 1;
      }
      if (index <= 0) {
        index = 0;
      }

      clearTimeout(regionTimeout);

      const regionTimeout = setTimeout(() => {
        if (mapIndex !== index) {
          mapIndex = index;
          // const { latitude, longitude } = coffeeCoordinates[index];
          _map.current.animateToRegion(
            {
              latitude: coffeeCoordinates[index].latitude,
              longitude: coffeeCoordinates[index].longitude,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            },
            100
          );
          const x = mapIndex;
          _scrollViewHeader.current.scrollTo({ x, y: 0, animated: true });
        }
      }, 100);
    });
  };

  const onMarkerPress = (e) => {
    console.log(e.nativeEvent.coordinate.latitude);
  };

  const interpolations = coffeeCoordinates.map((marker, index) => {
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      ((index + 1) * CARD_WIDTH),
    ];

    const scale = mapAnimation.interpolate({
      inputRange,
      outputRange: [1, 1.5, 1],
      extrapolate: 'clamp'
    });

    return { scale };
  });

  const onDirection = (latitude, longitude) => {
    setDirect(true);
    setDestinationCoordinate({ latitude, longitude });
  };

  const onStart = (latitude, longitude) => {
    watchPosition();
    setCardFooter(false);
    setCardHeader(false);
    setCardButton(true);
    setDirect(true);
    setDestinationCoordinate({ latitude, longitude });
    setBoxOne(false);
    setBoxTwo(true);
    setZoom(20);
    setTimeTraveler();
  };

  const offStart = () => {
    setCardFooter(true);
    setCardHeader(true);
    setCardButton(false);
    setBoxOne(true);
    setBoxTwo(false);
    setZoom(15);
  };
  const setTimeTraveler = () => {
    // var d = Number(time);
    var d = Math.round(time * 100);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h === 1 ? ' hour : ' : ' hours : ') : '';
    var mDisplay = m > 0 ? m + (m === 1 ? ' minute : ' : ' minutes : ') : '';
    var sDisplay = s > 0 ? s + (s === 1 ? ' second' : ' seconds') : '';

    if (distance >= 1.0) {
      var dDisplay = `${distance} Km.`;
    }
    if (distance < 1.0) {
      var dDisplay = `${distance} meter`;
    }
    return {
      hDisplay, mDisplay, sDisplay, dDisplay
    };
  };

  const _map = React.useRef(null);
  const _scrollView = React.useRef(null);
  const _scrollViewHeader = React.useRef(null);

  return (
    <View style={styles.container}>
      <MapView
        ref={_map}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={getMapRegion()}
        showUserLocation
        showsMyLocationButton
        zoomEnabled
        minZoomLevel={zoom}
        maxZoomLevel={30}
        followUserLocation
        loadingEnabled
      >
        {coffeeCoordinates.map((coordinate, index) => {
          const scaleStyle = {
            transform: [
              {
                scale: interpolations[index].scale,
              },
            ],
          };
          return (
              <MapView.Marker key={`coordinate_${index}`} coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }} onPress={(e) => onMarkerPress(e)}>
                <Animated.View style={[styles.markerWrap]}>
                  <Animated.Image
                    source={IconMarker}
                    style={[styles.marker, scaleStyle]}
                    resizeMode="cover"
                  />
                </Animated.View>
              </MapView.Marker>
          );
        })}

      <Marker coordinate={originCoordinate}>
          <View style={styles.radiusOrigin}>
              <View style={styles.markerOrigin} />
          </View>
      </Marker>
          {direct && (
            onMapViewDirection()
          )}
      </MapView>
      {boxOne && (
        <View style={styles.labelBox}>
            <Text style={styles.labelBoxTitle}>
              skor (Net Flow) hasil perhitungan menggunakan promethee
            </Text>
        </View>
      )}
      {boxTwo && (
        <View style={styles.labelBoxSecond}>
            <Text style={styles.labelBoxTitleSecond}>
              Petunjuk Arah
            </Text>
        </View>
      )}
      {cardHeader && (
      <ScrollView
        ref={_scrollViewHeader}
        horizontal
        scrollEventThrottle={1}
        showsHorizontalScrollIndicator={false}
        height={50}
        style={styles.chipsScrollView}
        contentInset={{ // iOS only
          top: 0,
          left: 0,
          bottom: 0,
          right: 20
        }}
        contentContainerStyle={{
          paddingRight: Platform.OS === 'android' ? 20 : 0
        }}
      >
        {coffeeCoordinates.map((coffee, index) => (
          <TouchableOpacity key={index} style={styles.chipsItem}>
            <Text style={styles.chipsText}>{`${index + 1}). ${coffee.name} : ${coffee.score}`}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      )}
      {cardFooter && (
      <Animated.ScrollView
        ref={_scrollView}
        horizontal
        scrollEventThrottle={1}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        pagingEnabled
        snapToInterval={CARD_WIDTH + 20}
        snapToAlignment="center"
        contentInset={{
          top: 0,
          left: SPACING_FOR_CARD_INSET,
          bottom: 0,
          right: SPACING_FOR_CARD_INSET
        }}
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === 'android' ? SPACING_FOR_CARD_INSET : 0
        }}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  x: mapAnimation,
                }
              },
            },
          ],
          { useNativeDriver: true }
        )}
      >
            {coffeeCoordinates.map((marker, index) => (
              <View style={styles.card} key={index}>
                <Image
                  source={{ uri: marker.image }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                <View style={styles.textContent}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {index + 1}
                    {' '}
                    {marker.name}
                    {' '}
                  </Text>
                  <Text numberOfLines={1} style={styles.cardAddress}>
                    {' '}
                    {marker.address }
                    {' '}
                  </Text>
                  <View style={styles.button}>
                    <ButtonModal icon="direction" title="Petunjuk Arah" type="map" height={14} width={14} onPress={() => onDirection(marker.latitude, marker.longitude)} />
                    <Gap width={5} />
                    <ButtonModal icon="navigation" title="Mulai" type="map" height={12} width={15} onPress={() => onStart(marker.latitude, marker.longitude)} />
                  </View>
                </View>
              </View>
            ))}
      </Animated.ScrollView>
      )}
      { cardButton && (
      <View style={styles.labelBoxBottom}>
          <IconGoogle />
        <View style={styles.labelBoxBottomTextWrapper}>
          <Text style={styles.labelBoxBottomTextDuration}>
              {' '}
              { setTimeTraveler().dDisplay}
              {' '}
          </Text>
          <Gap height={5} />
          <Text style={styles.labelBoxBottomTextTime}>
            { setTimeTraveler().hDisplay + setTimeTraveler().mDisplay + setTimeTraveler().sDisplay }
          </Text>
        </View>
        <TouchableOpacity style={styles.labelBoxBottomButton} onPress={() => offStart()}>
            <Button type="icon-button" icon="x" onPress={() => offStart()} />
        </TouchableOpacity>
      </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
  },
  button: {
    flexDirection: 'row',
    // alignItems: 'center',
    marginTop: 5
  },
  card: {
    // padding: 10,
    elevation: 2,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowRadius: 5,
    shadowOpacity: 0.3,
    shadowOffset: { x: 2, y: -2 },
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
    overflow: 'hidden',
  },
  cardImage: {
    flex: 3,
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  cardTitle: {
    fontFamily: fonts.Akkurat.bold,
    fontSize: 13,
  },
  cardDescription: {
    fontFamily: fonts.Akkurat.normalItalic,
    fontSize: 12,
    color: '#333',
  },
  cardAddress: {
    fontFamily: fonts.Akkurat.normalItalic,
    fontSize: 11,
    color: '#444',
  },
  chipsScrollView: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 70,
    paddingHorizontal: 10
  },
  chipsItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    height: 35,
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  chipsText: {
    fontFamily: fonts.sfProDisplay.medium,
    fontSize: 14
  },
  radiusOrigin: {
    height: 50,
    width: 50,
    borderRadius: 50 / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerOrigin: {
    height: 20,
    width: 20,
    borderRadius: 20 / 2,
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
    backgroundColor: '#007AFF',
  },
  markerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  marker: {
    width: 19,
    height: 25,
  },
  labelBox: {
    position: 'absolute',
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#fff',
    width: '90%',
    alignSelf: 'center',
    borderRadius: 5,
    padding: 10,
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  labelBoxTitle: {
    fontSize: 15,
    fontFamily: fonts.sfProDisplay.boldItalic,
  },
  labelBoxSecond: {
    position: 'absolute',
    marginTop: Platform.OS === 'ios' ? 10 : 5,
    marginLeft: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'green',
    width: '95%',
    height: '14%',
    alignItems: 'center',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  labelBoxTitleSecond: {
    fontSize: 25,
    fontFamily: fonts.sfProDisplay.heavy,
    color: 'white'
  },
  labelBoxBottom: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    width: '100%',
    height: '9%',
    alignItems: 'center',
    borderTopRightRadius: 17,
    borderTopLeftRadius: 17,
    padding: 20,
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  labelBoxBottomButton: {
    borderWidth: 2,
    height: 40,
    width: 40,
    borderRadius: 40 / 2,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  labelBoxBottomTextWrapper: {
    alignItems: 'center'
  },
  labelBoxBottomTextTime: {
    fontSize: 15,
    fontFamily: fonts.Akkurat.normal
  },
  labelBoxBottomTextDuration: {
    fontSize: 18,
    fontFamily: fonts.Akkurat.bold
  },
  scrollView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
  },
  textContent: {
    flex: 2,
    padding: 10,
  },
});
export default Map;
