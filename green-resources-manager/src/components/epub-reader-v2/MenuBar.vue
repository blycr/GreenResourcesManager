<template> 
       <div class="menu-bar">
            <div class="menu-wrapper" :class="{'hide-box-shadow':ifSettingShow}">
                <div class="icon-wrapper">
                    <span class="icon-menu icon" @click="showSetting(3)"></span>
                </div>
                <div class="icon-wrapper">
                <span class="icon-progress icon" @click="showSetting(2)"></span>
                </div>
                <div class="icon-wrapper">
                <span class="icon-bright icon" @click="showSetting(1)"></span>
                </div>
                <div class="icon-wrapper">
                    <span class="icon-a icon" @click="showSetting(0)">A</span>
                </div>
            </div>
            <transition name="slide-left">
                <div class="setting-wrapper" v-show="ifSettingShow">
                <div class="setting-font-size" v-if="showTag === 0">
                    <div class="preview" :style="{fontSize:fontSizeList[0].fontSize + 'px'}">
                        A
                    </div>
                    <div class="select">
                        <div class="select-wrapper" v-for="(item,index) in fontSizeList" :key="index"
                        @click="setFontSize(item.fontSize)">
                            <div class="line"></div>
                            <div class="point-wrapper">
                                <div class="point" v-show="defaultFontSize === item.fontSize">
                                    <div class="small-point"></div>
                                </div>
                            </div>
                            <div class="line"></div>
                        </div>
                    </div>
                    <div class="preview" :style="{fontSize:fontSizeList[fontSizeList.length - 1].fontSize + 'px'}">
                        A
                    </div>
                </div>
                <div class="setting-theme" v-else-if="showTag === 1">
                    <div class="setting-theme-item" v-for="(item,index) in themeList" :key="index"
                    @click="setTheme(index)">
                        <div class="preview" :style="{background:item.style.body.background}"
                        :class="{'no-border':item.style.body.background!=='#fff'}"></div>
                        <div class="text" :class="{'selected':index=== defaultTheme}">{{item.name}}</div>
                    </div>
                </div>
                <div class="setting-progress" v-else-if="showTag === 2">
                   <div class="progress-wrapper">
                        <input class="progress" 
                        type="range" 
                        max="100" 
                        min = "0"
                        step = "1" 
                        @change="onProgressChange($event.target.value)"
                        @input="onProgressInput($event.target.value)" 
                        :value="progress"
                        :disabled="!bookAvailable" 
                        ref="progress">
                   </div>
                   <div class="text-wrapper">
                        <span>{{bookAvailable ? progress + '%' : '加载中...'}}</span>
                   </div>
                </div>
            </div>
            </transition>
            <content-view :ifShowContent="ifShowContent"
                v-show="ifShowContent"
                :navigation="navigation"
                :bookAvailable = "bookAvailable"
                @jumpTo = "jumpTo">
            </content-view>
            <transition name="fade">
                <div class="content-mask" v-show="ifShowContent"
                @click="hideContent">
                </div>
            </transition>
       </div>
</template>
<script>
import ContentView from './ContentView.vue'
export default {
    components:{
        ContentView
    },
    props:{
        ifTitleAndMenuShow :{
            type:Boolean,
            default:false
        },
        fontSizeList:Array,
        defaultFontSize:Number,
        themeList:Array,
        defaultTheme:Number,
        bookAvailable : {
            type: Boolean,
            default:false
        },
        navigation:Object,
        parentProgress:Number
    },
    data(){
        return{
            ifSettingShow:false,
            showTag: 0,
            progress: 0,
            ifShowContent:false,
        }
    },
    watch:{
        bookAvailable:{
            handler:function(){
                this.getCurrentLocation()
            }
        },
        parentProgress: {
            handler : function (value){
                this.progress = value
                if(this.bookAvailable && this.$refs.progress){
                this.$refs.progress.style.backgroundSize = `${this.progress}% 100%`
                }
            },
            deep:true   
        }
    },
    methods:{
        getCurrentLocation(){
            this.$emit('getCurrentLocation')
        },
        hideContent(){
            this.ifShowContent = false
        },
        jumpTo(target){
            this.$emit('jumpTo',target)
        },
        // 拖动进度条触发事件
        onProgressInput(progress){
            this.progress = progress
            if(this.$refs.progress){
                this.$refs.progress.style.backgroundSize = `${this.progress}% 100%`
            }
        },
        // 进度条松开后触发事件，根据进度条数值跳转到指定位置
        onProgressChange(progress){
            this.$emit('onProgressChange',progress)
        },
        setTheme(index){
            this.$emit('setTheme',index)
        },
        setFontSize(fontSize){
            this.$emit('setFontSize',fontSize)
        },
        showSetting(tag){
            this.showTag = tag
            if(this.showTag === 3){
                this.ifSettingShow = false
                this.ifShowContent = true
            }else{
                this.ifSettingShow = true
            }
        },
        hideSetting(){
            this.ifSettingShow = false
        }
    }
}
</script>

<style scoped lang='scss'>
@import '../../styles/epub-reader-v2/global';

    .menu-bar{
        position: relative;
        width: 60px;
        height: 100%;
        flex-shrink: 0;
        background: var(--bg-secondary, #f5f5f5);
        border-left: 1px solid var(--border-color, #e0e0e0);
        display: flex;
        flex-direction: column;
        
        .menu-wrapper{
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            z-index: 10;
            background: var(--bg-secondary, #f5f5f5);
            box-shadow: -2px 0 8px rgba(0,0,0,.1);
            &.hide-box-shadow{
                box-shadow: none;
            }
            .icon-wrapper{
                flex: 0 0 60px;
                width: 100%;
                @include center;
                cursor: pointer;
                border-bottom: 1px solid var(--border-color, #e0e0e0);
                transition: background 0.2s ease;
                &:hover {
                    background: var(--bg-tertiary, #e8e8e8);
                }
                &:last-child {
                    border-bottom: none;
                }
                .icon {
                    font-size: 24px;
                    color: var(--text-primary, #333);
                }
                .icon-a{
                    font-size: 20px;
                    font-weight: 600;
                }
            }
        }        
        .setting-wrapper{
            position: absolute;
            top: 0;
            right: 60px;
            z-index: 11;
            width: 300px;
            height: 100%;
            background: var(--bg-secondary, white);
            box-shadow: -2px 0 8px rgba(0,0,0,.15);
            overflow-y: auto;
            .setting-font-size{
                display: flex;
                flex-direction: column;
                padding: 20px;
                min-height: 100%;
                .preview{
                    flex: 0 0 50px;
                    @include center;
                    font-weight: 600;
                    font-size: 20px;
                    margin-bottom: 10px;
                }
                .select{
                    display: flex;
                    flex: 1;
                    flex-direction: column;
                    margin: 20px 0;
                        .select-wrapper{
                        flex: 0 0 40px;
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        margin-bottom: 10px;
                        &:first-child{
                            .line{
                                &:first-child{
                                    border-top: none;
                                }
                            }
                        }

                        &:last-child{
                            .line{
                                &:last-child{
                                    border-top: none;
                                }
                            }
                        }
                        .line{
                            flex: 1;
                            height: 0;
                            border-top: 1px solid #ccc ;
                        }
                        .point-wrapper{
                            position: relative;
                            flex: 0 0 20px;
                            width: 20px;
                            height: 20px;
                            .point{
                                position: absolute;
                                top: -10px;
                                left: 0;
                                width: 20px;
                                height: 20px;
                                border-radius: 50%;
                                background: white;
                                border: 1px solid #ccc;
                                box-shadow: 0 4px 4px rgba(0,0,0,.15);
                                @include center;
                                .small-point{
                                    width: 5px;
                                    height: 5px;
                                    background: black;
                                    border-radius: 50%;
                                }
                            }
                        }
                    }
                }
            }

            .setting-theme{
                padding: 20px;
                display:flex;
                flex-direction: column;
                gap: 15px;
                    .setting-theme-item{
                    flex: 0 0 auto;
                    display:flex;
                    flex-direction:row;
                    align-items: center;
                    gap: 10px;
                    padding: 10px;
                    box-sizing:border-box;
                    cursor: pointer;
                    border: 1px solid var(--border-color, #e0e0e0);
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    &:hover {
                        background: var(--bg-tertiary, #f5f5f5);
                    }
                    .preview{
                        flex: 0 0 40px;
                        width: 40px;
                        height: 40px;
                        border: 1px solid #ccc;
                        box-sizing:border-box;
                        border-radius: 4px;
                        &.no-border{
                            border:none
                        }
                    }
                
                    .text{
                        flex: 1;
                        font-size: 16px;
                        color: var(--text-secondary, #999);
                        &.selected{
                            color: var(--text-primary, #333);
                            font-weight: 600;
                        }
                    }
                }
            }

            .setting-progress{
                position:relative;
                width:100%;
                padding: 20px;
                .progress-wrapper{
                    width:100%;
                    padding: 20px 0;
                    box-sizing: border-box;
                    .progress{
                        width:100%;
                        -webkit-appearance: none;
                        appearance: none;
                        height: 2px;
                        background: -webkit-linear-gradient(#999, #999) no-repeat, #ddd;
                        background-size: 0 100%;
                        cursor: pointer;
                        &:focus{
                            outline:none;
                        }
                        &::-webkit-slider-thumb{
                            -webkit-appearance:none;
                            appearance: none;
                            height: 20px;
                            width: 20px;
                            border-radius:50%;
                            background:white;
                            box-shadow: 0 4px 4px 0 rgba(0, 0, 0, .15);
                            border: 1px solid #ddd;
                        }
                    }
                }
                .text-wrapper{
                    width: 100%;
                    margin-top: 15px;
                    color: var(--text-primary, #333);
                    font-size: 14px;
                    text-align: center;
                }
            }
        }
        .content-mask{
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 11;
            display: flex;
            background: rgba(51,51,51,.8);
            cursor: pointer;
        }
    }
</style>

