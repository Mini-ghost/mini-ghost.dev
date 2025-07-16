export function useTalks() {
  return useAsyncData(
    'QUERY_TALKS',
    () => {
      return queryCollection('talks')
        .select('talks')
        .first();

    },
    {
      transform(result) {
        const talks: { year: string; content: any[] }[] = [];
        if(!result || !result.talks?.length) return talks;

        let group: any[] = [];
        let year: string | null = null;
        // console.log(typeof result.talks);


        result.talks?.forEach((talk) => {
          let current: string;
          if (
            (current = talk.date.slice(0, 4)) !== year &&
            typeof year === 'string'
          ) {
            talks.push({
              year,
              content: group,
            });

            group = [];
          }

          year = current;
          group.push(talk);
        });

        if (typeof year === 'string' && group.length) {
          talks.push({
            year,
            content: group,
          });
        }

        return {
          ...result,
          talks,
        };
      },
    }
  );
}
