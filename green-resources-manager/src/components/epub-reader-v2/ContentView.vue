<template>
  <transition name="slide-left">
      <div class="content">
          <div class="content-wrapper" v-if="bookAvailable">
              <div class="content-item" v-for="(item,index) in navigation.toc" :key="index"
                @click="jumpTo(item.href)">
                <span class="text">{{item.label}}</span>
              </div>
          </div>
          <div class="empty" v-else>加载中...</div>
      </div> 
  </transition>
</template>
<script>
export default {
    props:{
        ifShowContent:Boolean,
        navigation:Object,
        bookAvailable:Boolean
    },
    methods:{
        jumpTo(target){
            this.$emit('jumpTo',target)
        }
    }
}
</script>

<style scoped lang='scss'>
@import '../../styles/epub-reader-v2/global';

.content{
    position: fixed;
    top: 0;
    right: 0;
    z-index: 12;
    width: 80%;
    max-width: 400px;
    height:100%;
    background: var(--bg-secondary, white);
    .content-wrapper{
        width: 100%;
        height: 100%;
        overflow: auto;
        .content-item{
            padding: 20px 15px;
            border-bottom: 1px solid #f4f4f4;
            cursor: pointer;
            &:hover {
                background: #f5f5f5;
            }
            .text{
                font-size: 16px;
                color: #333;
            }
        }
    }
    .empty{
        width: 100%;
        height: 100%;
        @include center;
        font-size: 18px;
        color: #333;
    }
}
</style>

